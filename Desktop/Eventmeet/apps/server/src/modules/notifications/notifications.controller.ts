import { Request, Response } from 'express'
import { asyncHandler }      from '@/shared/middleware/errorHandler'
import { sendSuccess, sendPaginated } from '@/shared/utils/response'
import * as notificationsService from './notifications.service'

export const listNotificationsController = asyncHandler(async (req: Request, res: Response) => {
  const page       = Number(req.query.page)  || 1
  const limit      = Number(req.query.limit) || 20
  const unreadOnly = req.query.unread === 'true'
  const result = await notificationsService.listNotifications(req.user!.sub, page, limit, unreadOnly)
  sendPaginated(res, result.notifications, {
    page:  result.page,
    limit: result.limit,
    total: result.total,
    extra: { unreadCount: result.unreadCount },
  })
})

export const markAsReadController = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationsService.markAsRead(req.user!.sub, req.params.id)
  sendSuccess(res, notification, 'Marked as read')
})

export const markAllAsReadController = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationsService.markAllAsRead(req.user!.sub)
  sendSuccess(res, result, 'All notifications marked as read')
})

export const deleteNotificationController = asyncHandler(async (req: Request, res: Response) => {
  await notificationsService.deleteNotification(req.user!.sub, req.params.id)
  sendSuccess(res, null, 'Notification deleted')
})

export const getUnreadCountController = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationsService.getUnreadCount(req.user!.sub)
  sendSuccess(res, result)
})
