export interface CreateOrderInput {
  bookingId: string
}

export interface VerifyPaymentInput {
  bookingId:          string
  razorpayOrderId:    string
  razorpayPaymentId:  string
  razorpaySignature:  string
}

export interface InitiateRefundInput {
  bookingId: string
  reason:    'EVENT_CANCELLED' | 'BOOKING_FAILED' | 'USER_LEFT_BOOKING' | 'ACCOUNT_CLOSURE'
}
