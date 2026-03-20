import { prisma }             from '@/lib/prisma'
import { getIO, SocketEvents } from '@/lib/socket'
import { AppError }            from '@/shared/middleware/errorHandler'
import { logger }              from '@/shared/utils/logger'
import type { CreateNotificationInput } from './notifications.types'

// ─────────────────────────────────────────────────────────────────
// Create & push a notification (used internally by other modules)
// ─────────────────────────────────────────────────────────────────
export async function createNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId:  input.userId,
      type:    input.type,
      title:   input.title,
      body:    input.body,
      data:    input.data ?? {},
      eventId: input.eventId,
    },
  })

  // Real-time push via Socket.io
  try {
    getIO().to(`user:${input.userId}`).emit(SocketEvents.NOTIFICATION_NEW, {
      id:        notification.id,
      type:      notification.type,
      title:     notification.title,
      body:      notification.body,
      data:      notification.data,
      isRead:    false,
      createdAt: notification.createdAt,
    })
  } catch {
    // Socket not available — notification still persisted in DB
  }

  return notification
}

// ─────────────────────────────────────────────────────────────────
// List notifications for current user (paginated)
// ─────────────────────────────────────────────────────────────────
export async function listNotifications(userId: string, page: number, limit: number, unreadOnly: boolean) {
  const where = {
    userId,
    ...(unreadOnly ? { isRead: false } : {}),
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, type: true, title: true, body: true,
        isRead: true, data: true, createdAt: true,
        event: { select: { id: true, title: true } },
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ])

  return { notifications, page, limit, total, unreadCount }
}

// ─────────────────────────────────────────────────────────────────
// Mark one notification as read
// ─────────────────────────────────────────────────────────────────
export async function markAsRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  })

  if (!notification)                   throw new AppError(404, 'NOT_FOUND', 'Notification not found')
  if (notification.userId !== userId)  throw new AppError(403, 'FORBIDDEN', 'Not your notification')
  if (notification.isRead)             return notification  // already read — idempotent

  return prisma.notification.update({
    where: { id: notificationId },
    data:  { isRead: true },
  })
}

// ─────────────────────────────────────────────────────────────────
// Mark all as read
// ─────────────────────────────────────────────────────────────────
export async function markAllAsRead(userId: string) {
  const { count } = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data:  { isRead: true },
  })
  logger.info({ userId, count }, 'Marked all notifications as read')
  return { updated: count }
}

// ─────────────────────────────────────────────────────────────────
// Delete a notification
// ─────────────────────────────────────────────────────────────────
export async function deleteNotification(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  })

  if (!notification)                   throw new AppError(404, 'NOT_FOUND', 'Notification not found')
  if (notification.userId !== userId)  throw new AppError(403, 'FORBIDDEN', 'Not your notification')

  await prisma.notification.delete({ where: { id: notificationId } })
}

// ─────────────────────────────────────────────────────────────────
// Get unread count only (for badge in frontend)
// ─────────────────────────────────────────────────────────────────
export async function getUnreadCount(userId: string) {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  })
  return { unreadCount: count }
}
