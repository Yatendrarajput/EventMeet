import { Request, Response } from 'express'
import { asyncHandler } from '@/shared/middleware/errorHandler'
import { sendSuccess, sendCreated } from '@/shared/utils/response'
import * as paymentsService from './payments.service'

export const createOrderController = asyncHandler(async (req: Request, res: Response) => {
  const order = await paymentsService.createOrder(req.user!.sub, req.body)
  sendCreated(res, order, 'Razorpay order created')
})

export const verifyPaymentController = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentsService.verifyPayment(req.user!.sub, req.body)
  sendSuccess(res, result, result.alreadyConfirmed ? 'Booking already confirmed' : 'Payment verified — booking confirmed')
})

export const getPaymentStatusController = asyncHandler(async (req: Request, res: Response) => {
  const status = await paymentsService.getPaymentStatus(req.user!.sub, req.params.bookingId)
  sendSuccess(res, status)
})

export const initiateRefundController = asyncHandler(async (req: Request, res: Response) => {
  const refund = await paymentsService.initiateRefund(req.user!.sub, req.body)
  sendCreated(res, refund, 'Refund initiated — will be processed within 5-7 business days')
})

export const webhookController = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string
  await paymentsService.handleWebhook(req.body as Buffer, signature)
  res.status(200).json({ received: true })
})
