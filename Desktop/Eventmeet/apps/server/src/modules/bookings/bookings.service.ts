import { Decimal } from '@prisma/client/runtime/library'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { redis, RedisKeys, RedisTTL } from '@/lib/redis'
import { ticketQueue } from '@/lib/bullmq'
import { getIO, SocketEvents } from '@/lib/socket'
import { AppError } from '@/shared/middleware/errorHandler'
import { logger } from '@/shared/utils/logger'
import type { CreateBookingInput, CancelBookingInput } from './bookings.types'

const SOFT_RESERVATION_MINUTES = 15

// ─────────────────────────────────────────────────────────────────
// Acquire Redis lock (simple SET NX EX pattern)
// ─────────────────────────────────────────────────────────────────
async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX')
  return result === 'OK'
}

async function releaseLock(key: string): Promise<void> {
  await redis.del(key)
}

// ─────────────────────────────────────────────────────────────────
// Create booking (seat soft-reservation + PAYMENT_PENDING)
// ─────────────────────────────────────────────────────────────────
export async function createBooking(initiatorId: string, input: CreateBookingInput) {
  const { eventId, sectionId, participants = [] } = input

  const totalParticipants = 1 + participants.length  // initiator + others

  // 1. Verify section exists and has enough seats
  const section = await prisma.eventSection.findFirst({
    where: { id: sectionId, eventId },
  })
  if (!section) throw new AppError(404, 'SECTION_NOT_FOUND', 'Event section not found')
  if (section.availableSeats < totalParticipants) {
    throw new AppError(409, 'INSUFFICIENT_SEATS', `Only ${section.availableSeats} seats available`)
  }

  // 2. Check initiator doesn't already have an active booking for this event
  const existingBooking = await prisma.booking.findFirst({
    where: {
      eventId,
      initiatedBy: initiatorId,
      status: { in: ['INITIATED', 'QUEUE_PENDING', 'SEATS_PENDING', 'PAYMENT_PENDING', 'CONFIRMED'] },
    },
  })
  if (existingBooking) throw new AppError(409, 'BOOKING_EXISTS', 'You already have an active booking for this event')

  // 3. Acquire seat lock
  const lockKey = RedisKeys.seatLock(eventId, sectionId)
  const locked  = await acquireLock(lockKey, RedisTTL.seatLock)
  if (!locked) throw new AppError(409, 'SEAT_LOCK_BUSY', 'Seat allocation in progress, please retry in a moment')

  try {
    // 4. Re-check seats under lock
    const freshSection = await prisma.eventSection.findUnique({ where: { id: sectionId } })
    if (!freshSection || freshSection.availableSeats < totalParticipants) {
      throw new AppError(409, 'INSUFFICIENT_SEATS', 'Not enough seats available')
    }

    const pricePerSeat    = new Decimal(freshSection.pricePerSeat.toString())
    const baseAmount      = pricePerSeat.mul(totalParticipants)
    const perPersonAmount = pricePerSeat
    const softExpiry      = new Date(Date.now() + SOFT_RESERVATION_MINUTES * 60 * 1000)

    // 5. Create booking + participant records + decrement seats — all in one transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Decrement available seats
      await tx.eventSection.update({
        where: { id: sectionId },
        data:  { availableSeats: { decrement: totalParticipants } },
      })

      // Create booking
      const newBooking = await tx.booking.create({
        data: {
          eventId,
          sectionId,
          initiatedBy:              initiatorId,
          status:                   'PAYMENT_PENDING',
          totalParticipants,
          baseAmount,
          finalAmount:              baseAmount,
          perPersonAmount,
          softReservationExpiresAt: softExpiry,
          paymentDeadline:          softExpiry,
          participants: {
            create: [
              { userId: initiatorId, status: 'CONFIRMED', amountDue: perPersonAmount },
              ...participants.map(userId => ({
                userId,
                status:    'INVITED' as const,
                amountDue: perPersonAmount,
              })),
            ],
          },
        },
        include: {
          event:   { select: { id: true, title: true, startDatetime: true } },
          section: { select: { id: true, name: true, pricePerSeat: true } },
          participants: {
            select: {
              id: true, status: true, amountDue: true,
              user: { select: { id: true, fullName: true } },
            },
          },
        },
      })

      return newBooking
    })

    return booking
  } finally {
    await releaseLock(lockKey)
  }
}

// ─────────────────────────────────────────────────────────────────
// Confirm booking (simulate payment → CONFIRMED + issue tickets)
// ─────────────────────────────────────────────────────────────────
export async function confirmBooking(userId: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { participants: { select: { userId: true } } },
  })

  if (!booking)                       throw new AppError(404, 'NOT_FOUND',   'Booking not found')
  if (booking.initiatedBy !== userId) throw new AppError(403, 'FORBIDDEN',   'Only the booking initiator can confirm')
  if (booking.status !== 'PAYMENT_PENDING') {
    throw new AppError(400, 'INVALID_STATUS', `Cannot confirm a booking with status ${booking.status}`)
  }
  if (booking.softReservationExpiresAt && booking.softReservationExpiresAt < new Date()) {
    throw new AppError(410, 'RESERVATION_EXPIRED', 'Seat reservation has expired')
  }

  // Confirm booking + create tickets in one transaction
  const confirmedBooking = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status:              'CONFIRMED',
        paymentCompletedAt:  new Date(),
        paymentInitiatedAt:  new Date(),
      },
    })

    // Generate a ticket for each participant
    const participantIds = booking.participants.map(p => p.userId)
    await tx.ticket.createMany({
      data: participantIds.map(participantId => ({
        bookingId,
        userId:    participantId,
        eventId:   booking.eventId,
        sectionId: booking.sectionId,
        qrCode:    `EVENTMEET-${bookingId}-${participantId}-${uuidv4()}`,
        status:    'GENERATED' as const,
      })),
    })

    return updated
  })

  // Queue ticket delivery job
  await ticketQueue.add('generate-tickets', {
    bookingId,
    userIds: booking.participants.map(p => p.userId),
  })

  // Notify initiator via Socket
  try {
    getIO().to(`user:${userId}`).emit(SocketEvents.BOOKING_CONFIRMED, { bookingId })
  } catch {
    // non-critical
  }

  logger.info({ bookingId, userId }, 'Booking confirmed, tickets queued')
  return confirmedBooking
}

// ─────────────────────────────────────────────────────────────────
// Cancel booking
// ─────────────────────────────────────────────────────────────────
export async function cancelBooking(userId: string, bookingId: string, input: CancelBookingInput) {
  const booking = await prisma.booking.findUnique({
    where:   { id: bookingId },
    include: { participants: { select: { userId: true } } },
  })

  if (!booking) throw new AppError(404, 'NOT_FOUND', 'Booking not found')

  const isParty = booking.initiatedBy === userId || booking.participants.some(p => p.userId === userId)
  if (!isParty) throw new AppError(403, 'FORBIDDEN', 'Not your booking')

  const cancellableStatuses = ['PAYMENT_PENDING', 'CONFIRMED']
  if (!cancellableStatuses.includes(booking.status)) {
    throw new AppError(400, 'INVALID_STATUS', `Cannot cancel a booking with status ${booking.status}`)
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status:             'CANCELLED',
        cancelledAt:        new Date(),
        cancelledBy:        userId,
        cancellationReason: input.reason,
      },
    })

    // Release seats if payment was pending (not yet confirmed)
    if (booking.status === 'PAYMENT_PENDING') {
      await tx.eventSection.update({
        where: { id: booking.sectionId },
        data:  { availableSeats: { increment: booking.totalParticipants } },
      })
    }

    // Cancel all tickets
    await tx.ticket.updateMany({
      where: { bookingId },
      data:  { status: 'CANCELLED' },
    })
  })

  // Notify via Socket
  try {
    getIO().to(`user:${userId}`).emit(SocketEvents.BOOKING_CANCELLED, { bookingId })
  } catch {
    // non-critical
  }
}

// ─────────────────────────────────────────────────────────────────
// List my bookings
// ─────────────────────────────────────────────────────────────────
export async function listBookings(userId: string, page: number, limit: number) {
  const where = {
    OR: [
      { initiatedBy: userId },
      { participants: { some: { userId } } },
    ],
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, status: true, totalParticipants: true,
        finalAmount: true, perPersonAmount: true,
        softReservationExpiresAt: true, paymentDeadline: true,
        createdAt: true,
        event:   { select: { id: true, title: true, startDatetime: true, bannerUrl: true } },
        section: { select: { id: true, name: true } },
      },
    }),
    prisma.booking.count({ where }),
  ])

  return { bookings, page, limit, total }
}

// ─────────────────────────────────────────────────────────────────
// Get booking detail
// ─────────────────────────────────────────────────────────────────
export async function getBooking(userId: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      event:   { select: { id: true, title: true, startDatetime: true, bannerUrl: true } },
      section: { select: { id: true, name: true, pricePerSeat: true } },
      participants: {
        select: {
          id: true, status: true, amountDue: true, paidAt: true,
          user: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      },
    },
  })

  if (!booking) throw new AppError(404, 'NOT_FOUND', 'Booking not found')

  const isParty = booking.initiatedBy === userId || booking.participants.some(p => p.user.id === userId)
  if (!isParty) throw new AppError(403, 'FORBIDDEN', 'Not your booking')

  return booking
}

// ─────────────────────────────────────────────────────────────────
// Get ticket for a booking
// ─────────────────────────────────────────────────────────────────
export async function getTicket(userId: string, bookingId: string) {
  const ticket = await prisma.ticket.findFirst({
    where:   { bookingId, userId, status: { not: 'CANCELLED' } },
    include: {
      event:   { select: { id: true, title: true, startDatetime: true, bannerUrl: true } },
      section: { select: { id: true, name: true } },
      booking: { select: { id: true, status: true, totalParticipants: true } },
    },
  })

  if (!ticket) throw new AppError(404, 'NOT_FOUND', 'Ticket not found — booking may not be confirmed yet')
  return ticket
}
