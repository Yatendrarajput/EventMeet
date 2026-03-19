import { ConnectionStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AppError } from '@/shared/middleware/errorHandler'
import type { SendConnectionRequestInput } from './connections.types'

// ─────────────────────────────────────────────────────────────────
// Send connection request (must share an event availability)
// ─────────────────────────────────────────────────────────────────
export async function sendRequest(
  senderId:   string,
  receiverId: string,
  eventId:    string,
  input:      SendConnectionRequestInput
) {
  if (senderId === receiverId) {
    throw new AppError(400, 'INVALID_REQUEST', 'Cannot connect with yourself')
  }

  // Both users must have ACTIVE availability for the same event
  const [senderAvail, receiverAvail] = await Promise.all([
    prisma.eventAvailability.findFirst({ where: { userId: senderId,   eventId, status: 'ACTIVE' } }),
    prisma.eventAvailability.findFirst({ where: { userId: receiverId, eventId, status: 'ACTIVE' } }),
  ])

  if (!senderAvail)   throw new AppError(400, 'NOT_AVAILABLE', 'You are not marked available for this event')
  if (!receiverAvail) throw new AppError(400, 'RECEIVER_NOT_AVAILABLE', 'That user is not available for this event')

  // Check existing request
  const existing = await prisma.connectionRequest.findUnique({
    where: { senderId_receiverId_eventId: { senderId, receiverId, eventId } },
  })

  if (existing) {
    if (existing.status === ConnectionStatus.ACCEPTED)  throw new AppError(409, 'ALREADY_CONNECTED', 'Already connected')
    if (existing.status === ConnectionStatus.PENDING)   throw new AppError(409, 'REQUEST_PENDING',   'Request already sent')
    if (existing.status === ConnectionStatus.BLOCKED)   throw new AppError(403, 'BLOCKED',           'Connection not allowed')
  }

  // Check if receiver already sent a request — auto-accept
  const reverse = await prisma.connectionRequest.findUnique({
    where: { senderId_receiverId_eventId: { senderId: receiverId, receiverId: senderId, eventId } },
  })

  if (reverse && reverse.status === ConnectionStatus.PENDING) {
    const accepted = await prisma.connectionRequest.update({
      where: { id: reverse.id },
      data:  { status: ConnectionStatus.ACCEPTED, respondedAt: new Date() },
    })
    return { request: accepted, autoAccepted: true }
  }

  const request = await prisma.connectionRequest.create({
    data: {
      senderId,
      receiverId,
      eventId,
      message:        input.message,
      isQuickConnect: input.isQuickConnect ?? false,
      status:         input.isQuickConnect ? ConnectionStatus.QUICK_CONNECT : ConnectionStatus.PENDING,
    },
    select: {
      id: true, status: true, message: true, isQuickConnect: true, createdAt: true,
      receiver: { select: { id: true, fullName: true, avatarUrl: true } },
      event:    { select: { id: true, title: true } },
    },
  })

  return { request, autoAccepted: false }
}

// ─────────────────────────────────────────────────────────────────
// Respond to a connection request (accept / decline / block)
// ─────────────────────────────────────────────────────────────────
export async function respondToRequest(
  userId:        string,
  connectionId:  string,
  action:        'ACCEPT' | 'DECLINE' | 'BLOCK'
) {
  const conn = await prisma.connectionRequest.findUnique({ where: { id: connectionId } })

  if (!conn)                      throw new AppError(404, 'NOT_FOUND',       'Connection request not found')
  if (conn.receiverId !== userId) throw new AppError(403, 'FORBIDDEN',       'Not your request to respond to')
  if (conn.status !== 'PENDING')  throw new AppError(400, 'ALREADY_HANDLED', 'Request already handled')

  const statusMap = {
    ACCEPT:  ConnectionStatus.ACCEPTED,
    DECLINE: ConnectionStatus.DECLINED,
    BLOCK:   ConnectionStatus.BLOCKED,
  }

  const updated = await prisma.connectionRequest.update({
    where: { id: connectionId },
    data:  { status: statusMap[action], respondedAt: new Date() },
    select: {
      id: true, status: true, respondedAt: true,
      sender:   { select: { id: true, fullName: true, avatarUrl: true } },
      receiver: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  })

  return updated
}

// ─────────────────────────────────────────────────────────────────
// Remove / withdraw a connection
// ─────────────────────────────────────────────────────────────────
export async function removeConnection(userId: string, connectionId: string) {
  const conn = await prisma.connectionRequest.findUnique({ where: { id: connectionId } })

  if (!conn) throw new AppError(404, 'NOT_FOUND', 'Connection not found')

  const isParty = conn.senderId === userId || conn.receiverId === userId
  if (!isParty) throw new AppError(403, 'FORBIDDEN', 'Not your connection')

  await prisma.connectionRequest.delete({ where: { id: connectionId } })
}

// ─────────────────────────────────────────────────────────────────
// List my accepted connections
// ─────────────────────────────────────────────────────────────────
export async function listConnections(userId: string, page: number, limit: number) {
  const where = {
    status: ConnectionStatus.ACCEPTED,
    OR: [{ senderId: userId }, { receiverId: userId }],
  }

  const [connections, total] = await Promise.all([
    prisma.connectionRequest.findMany({
      where,
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { respondedAt: 'desc' },
      select: {
        id: true, status: true, message: true, respondedAt: true, createdAt: true,
        sender:   { select: { id: true, fullName: true, avatarUrl: true, city: true } },
        receiver: { select: { id: true, fullName: true, avatarUrl: true, city: true } },
        event:    { select: { id: true, title: true } },
      },
    }),
    prisma.connectionRequest.count({ where }),
  ])

  // Normalize: always return the "other" user as the connection
  const normalized = connections.map(c => ({
    id:           c.id,
    status:       c.status,
    message:      c.message,
    respondedAt:  c.respondedAt,
    createdAt:    c.createdAt,
    event:        c.event,
    connectedUser: c.senderId === userId ? c.receiver : c.sender,
  }))

  return { connections: normalized, page, limit, total }
}

// ─────────────────────────────────────────────────────────────────
// List pending requests received by me
// ─────────────────────────────────────────────────────────────────
export async function listPendingRequests(userId: string, page: number, limit: number) {
  const where = { receiverId: userId, status: ConnectionStatus.PENDING }

  const [requests, total] = await Promise.all([
    prisma.connectionRequest.findMany({
      where,
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, status: true, message: true, isQuickConnect: true, createdAt: true,
        sender: { select: { id: true, fullName: true, avatarUrl: true, city: true, bio: true } },
        event:  { select: { id: true, title: true } },
      },
    }),
    prisma.connectionRequest.count({ where }),
  ])

  return { requests, page, limit, total }
}

// ─────────────────────────────────────────────────────────────────
// List requests I sent (still pending)
// ─────────────────────────────────────────────────────────────────
export async function listSentRequests(userId: string, page: number, limit: number) {
  const where = { senderId: userId, status: ConnectionStatus.PENDING }

  const [requests, total] = await Promise.all([
    prisma.connectionRequest.findMany({
      where,
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, status: true, message: true, isQuickConnect: true, createdAt: true,
        receiver: { select: { id: true, fullName: true, avatarUrl: true, city: true } },
        event:    { select: { id: true, title: true } },
      },
    }),
    prisma.connectionRequest.count({ where }),
  ])

  return { requests, page, limit, total }
}
