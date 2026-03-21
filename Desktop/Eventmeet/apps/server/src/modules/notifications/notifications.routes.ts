import { Router }       from 'express'
import { authenticate } from '@/shared/middleware/authenticate'
import * as controller  from './notifications.controller'

export const notificationsRouter = Router()

notificationsRouter.use(authenticate)

notificationsRouter.get('/',             controller.listNotificationsController)
notificationsRouter.get('/unread-count', controller.getUnreadCountController)
notificationsRouter.patch('/read-all',   controller.markAllAsReadController)
notificationsRouter.patch('/:id/read',   controller.markAsReadController)
notificationsRouter.delete('/:id',       controller.deleteNotificationController)
