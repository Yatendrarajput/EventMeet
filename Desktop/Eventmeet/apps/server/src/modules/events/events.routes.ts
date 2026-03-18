import { Router } from 'express'
import { authenticate } from '@/shared/middleware/authenticate'
import { validate } from '@/shared/middleware/validate'
import { AppError } from '@/shared/middleware/errorHandler'
import { prisma } from '@/lib/prisma'
import { asyncHandler } from '@/shared/middleware/errorHandler'
import * as schema from './events.schema'
import * as controller from './events.controller'

// ── Admin guard — checks isAdmin flag from DB
const requireAdmin = asyncHandler(async (req, _res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { isAdmin: true },
  })
  if (!user?.isAdmin) throw new AppError(403, 'FORBIDDEN', 'Admin access required')
  next()
})

export const eventsRouter = Router()

// ── Public (authenticated) routes
eventsRouter.get('/',
  authenticate,
  validate({ query: schema.eventListQuery }),
  controller.listEventsController
)

eventsRouter.get('/:id',
  authenticate,
  validate({ params: schema.eventIdParams }),
  controller.getEventByIdController
)

eventsRouter.get('/:id/available-users',
  authenticate,
  validate({ params: schema.eventIdParams }),
  controller.getAvailableUsersController
)

eventsRouter.post('/:id/availability',
  authenticate,
  validate({ params: schema.eventIdParams, body: schema.setAvailabilityBody }),
  controller.setAvailabilityController
)

eventsRouter.delete('/:id/availability',
  authenticate,
  validate({ params: schema.eventIdParams }),
  controller.removeAvailabilityController
)

// ── Admin-only routes
eventsRouter.post('/',
  authenticate,
  requireAdmin,
  validate({ body: schema.createEventBody }),
  controller.createEventController
)

eventsRouter.patch('/:id',
  authenticate,
  requireAdmin,
  validate({ params: schema.eventIdParams, body: schema.updateEventBody }),
  controller.updateEventController
)
