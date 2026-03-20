import Razorpay        from 'razorpay'
import crypto          from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { prisma }      from '@/lib/prisma'
import { ticketQueue, refundQueue } from '@/lib/bullmq'
import { getIO, SocketEvents }      from '@/lib/socket'
import { config }      from '@/config'
import { AppError }    from '@/shared/middleware/errorHandler'
import { logger }      from '@/shared/utils/logger'
import type { CreateOrderInput, VerifyPaymentInput, InitiateRefundInput } from './payments.types'

// ─────────────────────────────────────────────────────────────────
// Razorpay client — lazy init so missing keys don't crash server
// ─────────────────────────────────────────────────────────────────
let razorpayClient: Razorpay | null = null

function getRazorpay(): Razorpay {
  if (!razorpayClient) {
    if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) {
      throw new AppError(503, 'PAYMENT_UNAVAILABLE', 'Payment gateway not configured')
    }
    razorpayClient = new Razorpay({
      key_id:     config.RAZORPAY_KEY_ID,
      key_secret: config.RAZORPAY_KEY_SECRET,
    })
  }
  return razorpayClient
}

// ─────────────────────────────────────────────────────────────────
// Create Razorpay order
// ─────────────────────────────────────────────────────────────────
export async function createOrder(userId: string, input: CreateOrderInput) {
  const booking = await prisma.booking.findUnique({
    where:   { id: input.bookingId },
    include: { event: { select: { title: true } } },
  })

  if (!booking)                       throw new AppError(404, 'NOT_FOUND',      'Booking not found')
  if (booking.initiatedBy !== userId) throw new AppError(403, 'FORBIDDEN',      'Only the booking initiator can pay')
  if (booking.status !== 'PAYMENT_PENDING') {
    throw new AppError(400, 'INVALID_STATUS', `Booking status is ${booking.status} — payment not required`)
  }
  if (booking.softReservationExpiresAt && booking.softReservationExpiresAt < new Date()) {
    throw new AppError(410, 'RESERVATION_EXPIRED', 'Seat reservation has expired — please rebook')
  }

  // Amount in paise (Razorpay requires smallest currency unit)
  const amountPaise = Math.round(Number(booking.finalAmount) * 100)

  const idempotencyKey = booking.paymentIdempotencyKey ?? `booking_${booking.id}_${uuidv4()}`

  const order = await getRazorpay().orders.create({
    amount:   amountPaise,
    currency: 'INR',
    receipt:  idempotencyKey.slice(0, 40),
    notes: {
      bookingId: booking.id,
      eventName: booking.event.title,
      userId,
    },
  })

  // Persist idempotency key + payment initiated timestamp
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      paymentIdempotencyKey: idempotencyKey,
      paymentInitiatedAt:    new Date(),
    },
  })

  logger.info({ bookingId: booking.id, orderId: order.id }, 'Razorpay order created')

  return {
    orderId:    order.id,
    amount:     amountPaise,
    currency:   'INR',
    keyId:      config.RAZORPAY_KEY_ID,
    bookingId:  booking.id,
    eventName:  booking.event.title,
  }
}

// ─────────────────────────────────────────────────────────────────
// Verify payment signature + confirm booking + issue tickets
// ─────────────────────────────────────────────────────────────────
export async function verifyPayment(userId: string, input: VerifyPaymentInput) {
  const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = input

  if (!config.RAZORPAY_KEY_SECRET) {
    throw new AppError(503, 'PAYMENT_UNAVAILABLE', 'Payment gateway not configured')
  }

  // 1. Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex')

  if (expectedSignature !== razorpaySignature) {
    logger.warn({ bookingId, razorpayPaymentId }, 'Payment signature mismatch')
    throw new AppError(400, 'INVALID_SIGNATURE', 'Payment signature verification failed')
  }

  // 2. Fetch booking with participants
  const booking = await prisma.booking.findUnique({
    where:   { id: bookingId },
    include: { participants: { select: { userId: true } } },
  })

  if (!booking)                       throw new AppError(404, 'NOT_FOUND', 'Booking not found')
  if (booking.initiatedBy !== userId) throw new AppError(403, 'FORBIDDEN', 'Not your booking')
  if (booking.status === 'CONFIRMED') {
    // Idempotent — already confirmed (webhook may have beaten us)
    return { bookingId, status: 'CONFIRMED', alreadyConfirmed: true }
  }
  if (booking.status !== 'PAYMENT_PENDING') {
    throw new AppError(400, 'INVALID_STATUS', `Cannot confirm booking with status ${booking.status}`)
  }

  const participantIds = booking.participants.map(p => p.userId)

  // 3. Confirm booking + generate tickets in one transaction
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status:             'CONFIRMED',
        paymentCompletedAt: new Date(),
      },
    })

    await tx.ticket.createMany({
      data: participantIds.map(participantId => ({
        bookingId,
        userId:    participantId,
        eventId:   booking.eventId,
        sectionId: booking.sectionId,
        qrCode:    `EVENTMEET-${bookingId}-${participantId}-${uuidv4()}`,
        status:    'GENERATED' as const,
      })),
      skipDuplicates: true,
    })
  })

  // 4. Queue ticket delivery
  await ticketQueue.add('generate-tickets', { bookingId, userIds: participantIds })

  // 5. Notify via Socket
  try {
    getIO().to(`user:${userId}`).emit(SocketEvents.BOOKING_CONFIRMED, { bookingId })
  } catch { /* non-critical */ }

  logger.info({ bookingId, razorpayPaymentId }, 'Payment verified, booking confirmed')
  return { bookingId, status: 'CONFIRMED', alreadyConfirmed: false }
}

// ─────────────────────────────────────────────────────────────────
// Razorpay webhook handler (called from raw body route)
// ─────────────────────────────────────────────────────────────────
export async function handleWebhook(rawBody: Buffer, signature: string) {
  if (!config.RAZORPAY_WEBHOOK_SECRET) {
    logger.warn('Razorpay webhook secret not configured — skipping webhook')
    return
  }

  const expectedSig = crypto
    .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')

  if (expectedSig !== signature) {
    throw new AppError(400, 'INVALID_WEBHOOK_SIGNATURE', 'Webhook signature mismatch')
  }

  const payload = JSON.parse(rawBody.toString())
  const event   = payload.event

  logger.info({ event }, 'Razorpay webhook received')

  if (event === 'payment.captured') {
    const notes     = payload.payload?.payment?.entity?.notes ?? {}
    const bookingId = notes.bookingId
    const userId    = notes.userId

    if (bookingId && userId) {
      try {
        const booking = await prisma.booking.findUnique({
          where:   { id: bookingId },
          include: { participants: { select: { userId: true } } },
        })

        if (booking && booking.status === 'PAYMENT_PENDING') {
          const participantIds = booking.participants.map(p => p.userId)

          await prisma.$transaction(async (tx) => {
            await tx.booking.update({
              where: { id: bookingId },
              data: { status: 'CONFIRMED', paymentCompletedAt: new Date() },
            })
            await tx.ticket.createMany({
              data: participantIds.map(pId => ({
                bookingId,
                userId:    pId,
                eventId:   booking.eventId,
                sectionId: booking.sectionId,
                qrCode:    `EVENTMEET-${bookingId}-${pId}-${uuidv4()}`,
                status:    'GENERATED' as const,
              })),
              skipDuplicates: true,
            })
          })

          await ticketQueue.add('generate-tickets', { bookingId, userIds: participantIds })
          logger.info({ bookingId }, 'Webhook: booking confirmed via payment.captured')
        }
      } catch (err) {
        logger.error({ bookingId, err }, 'Webhook: failed to confirm booking')
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Get payment status for a booking
// ─────────────────────────────────────────────────────────────────
export async function getPaymentStatus(userId: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where:  { id: bookingId },
    select: {
      id: true, status: true, finalAmount: true, perPersonAmount: true,
      paymentInitiatedAt: true, paymentCompletedAt: true, paymentDeadline: true,
      softReservationExpiresAt: true, paymentIdempotencyKey: true,
      initiatedBy: true,
      participants: { select: { userId: true } },
    },
  })

  if (!booking) throw new AppError(404, 'NOT_FOUND', 'Booking not found')

  const isParty = booking.initiatedBy === userId || booking.participants.some(p => p.userId === userId)
  if (!isParty) throw new AppError(403, 'FORBIDDEN', 'Not your booking')

  return booking
}

// ─────────────────────────────────────────────────────────────────
// Initiate refund (queues BullMQ job)
// ─────────────────────────────────────────────────────────────────
export async function initiateRefund(userId: string, input: InitiateRefundInput) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
  })

  if (!booking)                       throw new AppError(404, 'NOT_FOUND',  'Booking not found')
  if (booking.initiatedBy !== userId) throw new AppError(403, 'FORBIDDEN',  'Only the booking initiator can request a refund')
  if (booking.status !== 'CONFIRMED') {
    throw new AppError(400, 'INVALID_STATUS', 'Only confirmed bookings can be refunded')
  }

  const idempotencyKey = `refund_${booking.id}_${uuidv4()}`

  // Create refund record in PENDING state
  const refund = await prisma.refund.create({
    data: {
      userId:        userId,
      bookingId:     booking.id,
      amount:        booking.finalAmount,
      reason:        input.reason,
      status:        'PENDING',
      idempotencyKey,
    },
  })

  // Queue refund processing job
  await refundQueue.add('process-refund', {
    bookingId: booking.id,
    reason:    input.reason,
  })

  logger.info({ bookingId: booking.id, refundId: refund.id }, 'Refund queued')
  return refund
}
