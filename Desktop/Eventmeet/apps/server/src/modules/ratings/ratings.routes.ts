import { Router }      from 'express'
import { authenticate } from '@/shared/middleware/authenticate'
import { validate }     from '@/shared/middleware/validate'
import * as schema      from './ratings.schema'
import * as controller  from './ratings.controller'

export const ratingsRouter = Router()

ratingsRouter.use(authenticate)

// Submit a rating
ratingsRouter.post('/',                                         validate({ body: schema.createRatingBody }), controller.createRatingController)

// Ratings received by a user
ratingsRouter.get('/user/:userId',                              controller.getUserRatingsController)

// Ratings I have given
ratingsRouter.get('/given',                                     controller.getMyGivenRatingsController)

// Check if I can rate someone for a specific booking
ratingsRouter.get('/can-rate/:userId/booking/:bookingId',       controller.checkCanRateController)
