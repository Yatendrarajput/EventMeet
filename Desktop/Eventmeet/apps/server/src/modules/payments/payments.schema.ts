import { z } from 'zod'

export const createOrderBody = z.object({
  bookingId: z.string().uuid(),
})

export const verifyPaymentBody = z.object({
  bookingId:         z.string().uuid(),
  razorpayOrderId:   z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
})

export const initiateRefundBody = z.object({
  bookingId: z.string().uuid(),
  reason:    z.enum(['EVENT_CANCELLED', 'BOOKING_FAILED', 'USER_LEFT_BOOKING', 'ACCOUNT_CLOSURE']),
})

export const webhookHeaders = z.object({
  'x-razorpay-signature': z.string(),
})
