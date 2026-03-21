import { Router } from 'express'
import { authenticate } from '@/shared/middleware/authenticate'
import { validate }     from '@/shared/middleware/validate'
import * as schema      from './bookings.schema'
import * as controller  from './bookings.controller'

export const bookingsRouter = Router()

bookingsRouter.use(authenticate)

bookingsRouter.post('/',                validate({ body: schema.createBookingBody }), controller.createBookingController)
bookingsRouter.get('/',                 controller.listBookingsController)
bookingsRouter.get('/:id',              controller.getBookingController)
bookingsRouter.post('/:id/confirm',     controller.confirmBookingController)
bookingsRouter.post('/:id/cancel',      validate({ body: schema.cancelBookingBody }), controller.cancelBookingController)
bookingsRouter.get('/:id/ticket',       controller.getTicketController)
