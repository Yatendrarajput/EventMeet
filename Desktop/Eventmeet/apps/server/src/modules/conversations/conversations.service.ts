import { prisma } from '@/lib/prisma'
import { getIO, SocketEvents } from '@/lib/socket'
import { AppError } from '@/shared/middleware/errorHandler'
import type { CreateConversationInput, SendMessageInput } from './conversations.types'

// ─────────────────────────────────────────────────────────────────
// Create a conversation (DIRECT or GROUP)
// ─────────────────────────────────────────────────────────────────
export async function createConversation(creatorId: string, input: CreateConversationInput) {
  const { type, eventId, name, memberIds } = input

  // Ensure the event exists
  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')

  // DIRECT: exactly 1 other member, no duplicates
  if (type === 'DIRECT') {
    if (memberIds.length !== 1) {
      throw new AppError(400, 'INVALID_REQUEST', 'Direct conversation requires exactly 1 other member')
    }
    const otherId = memberIds[0]

    // Check if DM already exists between these two for this event
    const existing = await prisma.conversation.findFirst({
      where: {
        type:     'DIRECT',
        eventId,
        deletedAt: null,
        members: {
          every: { userId: { in: [creatorId, otherId] }, status: 'ACTIVE' },
        },
      },
      include: { members: { select: { userId: true } } },
    })

    if (existing && existing.members.length === 2) {
      return existing
    }

    // Verify both users are connected
    const connected = await prisma.connectionRequest.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: creatorId, receiverId: otherId },
          { senderId: otherId,   receiverId: creatorId },
        ],
      },
    })
    if (!connected) throw new AppError(403, 'NOT_CONNECTED', 'You must be connected to start a DM')
  }

  // GROUP: name required, max 14 additional members (15 total)
  if (type === 'GROUP' && !name) {
    throw new AppError(400, 'NAME_REQUIRED', 'Group conversations require a name')
  }

  const allMemberIds = [...new Set([creatorId, ...memberIds])]

  const conversation = await prisma.conversation.create({
    data: {
      type,
      eventId,
      name:      type === 'GROUP' ? name : null,
      createdBy: creatorId,
      members: {
        create: allMemberIds.map(userId => ({
          userId,
          role:   userId === creatorId ? 'ADMIN' : 'MEMBER',
          status: 'ACTIVE',
        })),
      },
    },
    include: {
      members: {
        select: {
          id: true, role: true, joinedAt: true,
          user: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      },
      event: { select: { id: true, title: true } },
    },
  })

  return conversation
}

// ─────────────────────────────────────────────────────────────────
// List my conversations
// ─────────────────────────────────────────────────────────────────
export async function listConversations(userId: string, page: number, limit: number) {
  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where: {
        deletedAt: null,
        members: { some: { userId, status: 'ACTIVE' } },
      },
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { lastMessageAt: 'desc' },
      select: {
        id: true, type: true, name: true, status: true,
        lastMessageAt: true, lastMessagePreview: true, createdAt: true,
        event:   { select: { id: true, title: true } },
        members: {
          where:  { status: 'ACTIVE' },
          select: {
            id: true, role: true,
            user: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
      },
    }),
    prisma.conversation.count({
      where: {
        deletedAt: null,
        members: { some: { userId, status: 'ACTIVE' } },
      },
    }),
  ])

  return { conversations, page, limit, total }
}

// ─────────────────────────────────────────────────────────────────
// Get single conversation (with member check)
// ─────────────────────────────────────────────────────────────────
export async function getConversation(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id:        conversationId,
      deletedAt: null,
      members:   { some: { userId, status: 'ACTIVE' } },
    },
    include: {
      event:   { select: { id: true, title: true } },
      members: {
        where:  { status: 'ACTIVE' },
        select: {
          id: true, role: true, joinedAt: true,
          user: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      },
    },
  })

  if (!conversation) throw new AppError(404, 'NOT_FOUND', 'Conversation not found')
  return conversation
}

// ─────────────────────────────────────────────────────────────────
// Get messages (paginated, newest last)
// ─────────────────────────────────────────────────────────────────
export async function getMessages(userId: string, conversationId: string, page: number, limit: number) {
  // Verify membership
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  })
  if (!member || member.status !== 'ACTIVE') {
    throw new AppError(403, 'FORBIDDEN', 'Not a member of this conversation')
  }

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where:   { conversationId, deletedAt: null },
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, content: true, type: true, status: true, createdAt: true,
        sender: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    }),
    prisma.message.count({ where: { conversationId, deletedAt: null } }),
  ])

  return { messages, page, limit, total }
}

// ─────────────────────────────────────────────────────────────────
// Send a message + emit via Socket.io
// ─────────────────────────────────────────────────────────────────
export async function sendMessage(userId: string, conversationId: string, input: SendMessageInput) {
  // Verify membership
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  })
  if (!member || member.status !== 'ACTIVE') {
    throw new AppError(403, 'FORBIDDEN', 'Not a member of this conversation')
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content:  input.content,
        type:     'TEXT',
        status:   'SENT',
      },
      select: {
        id: true, content: true, type: true, status: true, createdAt: true,
        sender: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt:      new Date(),
        lastMessagePreview: input.content.slice(0, 100),
      },
    }),
  ])

  // Real-time delivery
  try {
    getIO().to(`conversation:${conversationId}`).emit(SocketEvents.MESSAGE_NEW, {
      conversationId,
      message,
    })
  } catch {
    // Socket not critical — message is already saved
  }

  return message
}

// ─────────────────────────────────────────────────────────────────
// Soft-delete a message (only sender can delete)
// ─────────────────────────────────────────────────────────────────
export async function deleteMessage(userId: string, conversationId: string, messageId: string) {
  const message = await prisma.message.findFirst({
    where: { id: messageId, conversationId, deletedAt: null },
  })

  if (!message)                    throw new AppError(404, 'NOT_FOUND', 'Message not found')
  if (message.senderId !== userId) throw new AppError(403, 'FORBIDDEN', 'You can only delete your own messages')

  await prisma.message.update({
    where: { id: messageId },
    data:  { deletedAt: new Date() },
  })

  // Notify room
  try {
    getIO().to(`conversation:${conversationId}`).emit(SocketEvents.MESSAGE_DELETED, {
      conversationId,
      messageId,
    })
  } catch {
    // Socket not critical
  }
}

// ─────────────────────────────────────────────────────────────────
// Leave a conversation
// ─────────────────────────────────────────────────────────────────
export async function leaveConversation(userId: string, conversationId: string) {
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  })

  if (!member || member.status !== 'ACTIVE') {
    throw new AppError(400, 'NOT_MEMBER', 'You are not in this conversation')
  }

  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data:  { status: 'LEFT', leftAt: new Date() },
  })
}
