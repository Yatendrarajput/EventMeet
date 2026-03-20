import { Router }       from 'express'
import express          from 'express'
import { authenticate } from '@/shared/middleware/authenticate'
import { validate }     from '@/shared/middleware/validate'
import * as schema      from './payments.schema'
import * as controller  from './payments.controller'

export const paymentsRouter = Router()

// Webhook must use raw body — registered BEFORE authenticate middleware
paymentsRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  controller.webhookController,
)

// All other routes require auth
paymentsRouter.use(authenticate)

paymentsRouter.post('/order',                validate({ body: schema.createOrderBody }),    controller.createOrderController)
paymentsRouter.post('/verify',               validate({ body: schema.verifyPaymentBody }),  controller.verifyPaymentController)
paymentsRouter.get('/status/:bookingId',     controller.getPaymentStatusController)
paymentsRouter.post('/refund',               validate({ body: schema.initiateRefundBody }), controller.initiateRefundController)
