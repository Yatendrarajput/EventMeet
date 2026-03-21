import { Router }       from 'express'
import { authenticate }  from '@/shared/middleware/authenticate'
import { requireAdmin }  from '@/shared/middleware/authenticate'
import { z }             from 'zod'
import { validate }      from '@/shared/middleware/validate'
import * as controller   from './admin.controller'

export const adminRouter = Router()

adminRouter.use(authenticate)
adminRouter.use(requireAdmin)

const addCreditsBody = z.object({
  userId:      z.string().uuid(),
  amount:      z.number().positive().max(100000),
  description: z.string().max(255).optional(),
})

const setAdminBody = z.object({
  makeAdmin: z.boolean(),
})

const cancelEventBody = z.object({
  reason: z.string().min(5).max(500),
})

// ── Stats
adminRouter.get('/stats',                        controller.getPlatformStatsController)

// ── Users
adminRouter.get('/users',                        controller.listUsersController)
adminRouter.patch('/users/:userId/ban',          controller.banUserController)
adminRouter.patch('/users/:userId/unban',        controller.unbanUserController)
adminRouter.patch('/users/:userId/admin',        validate({ body: setAdminBody }), controller.setAdminController)

// ── Credits
adminRouter.post('/credits',                     validate({ body: addCreditsBody }), controller.addCreditsController)

// ── Bookings
adminRouter.get('/bookings',                     controller.listAllBookingsController)

// ── Events
adminRouter.patch('/events/:eventId/cancel',     validate({ body: cancelEventBody }), controller.cancelEventController)
