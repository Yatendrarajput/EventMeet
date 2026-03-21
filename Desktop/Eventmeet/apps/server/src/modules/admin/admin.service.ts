import { Decimal } from '@prisma/client/runtime/library'
import { prisma }   from '@/lib/prisma'
import { AppError } from '@/shared/middleware/errorHandler'
import { addCredits } from '@/modules/credits/credits.service'
import { logger }   from '@/shared/utils/logger'

// ─────────────────────────────────────────────────────────────────
// Guard — throws if caller is not admin
// ─────────────────────────────────────────────────────────────────
async function assertAdmin(callerId: string) {
  const caller = await prisma.user.findUnique({ where: { id: callerId }, select: { isAdmin: true } })
  if (!caller?.isAdmin) throw new AppError(403, 'FORBIDDEN', 'Admin access required')
}

// ─────────────────────────────────────────────────────────────────
// Platform stats
// ─────────────────────────────────────────────────────────────────
export async function getPlatformStats(callerId: string) {
  await assertAdmin(callerId)

  const [
    totalUsers,
    verifiedUsers,
    totalEvents,
    publishedEvents,
    totalBookings,
    confirmedBookings,
    totalRevenue,
    totalRatings,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isVerified: true } }),
    prisma.event.count(),
    prisma.event.count({ where: { status: 'PUBLISHED' } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: 'CONFIRMED' } }),
    prisma.booking.aggregate({
      where:  { status: 'CONFIRMED' },
      _sum:   { finalAmount: true },
    }),
    prisma.rating.count(),
  ])

  return {
    users:    { total: totalUsers, verified: verifiedUsers },
    events:   { total: totalEvents, published: publishedEvents },
    bookings: { total: totalBookings, confirmed: confirmedBookings },
    revenue:  { total: Number(totalRevenue._sum.finalAmount ?? 0) },
    ratings:  { total: totalRatings },
  }
}

// ─────────────────────────────────────────────────────────────────
// List users with filters
// ─────────────────────────────────────────────────────────────────
export async function listUsers(
  callerId: string,
  page: number,
  limit: number,
  search?: string,
  isVerified?: boolean,
  isAdmin?: boolean,
) {
  await assertAdmin(callerId)

  const where: any = {
    deletedAt: null,
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email:    { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(isVerified !== undefined && { isVerified }),
    ...(isAdmin    !== undefined && { isAdmin }),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, fullName: true, isVerified: true,
        isAdmin: true, isActive: true, averageRating: true,
        totalRatings: true, createdAt: true, lastLoginAt: true,
      },
    }),
    prisma.user.count({ where }),
  ])

  return { users, page, limit, total }
}

// ─────────────────────────────────────────────────────────────────
// Ban / unban user
// ─────────────────────────────────────────────────────────────────
export async function setUserBan(callerId: string, targetUserId: string, ban: boolean) {
  await assertAdmin(callerId)
  if (callerId === targetUserId) throw new AppError(400, 'INVALID_ACTION', 'Cannot ban yourself')

  const user = await prisma.user.findUnique({ where: { id: targetUserId } })
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found')

  await prisma.user.update({
    where: { id: targetUserId },
    data:  { isActive: !ban },
  })

  logger.info({ callerId, targetUserId, action: ban ? 'ban' : 'unban' }, 'Admin user action')
  return { userId: targetUserId, banned: ban }
}

// ─────────────────────────────────────────────────────────────────
// Promote / demote admin
// ─────────────────────────────────────────────────────────────────
export async function setUserAdmin(callerId: string, targetUserId: string, makeAdmin: boolean) {
  await assertAdmin(callerId)
  if (callerId === targetUserId) throw new AppError(400, 'INVALID_ACTION', 'Cannot change own admin status')

  const user = await prisma.user.findUnique({ where: { id: targetUserId } })
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found')

  await prisma.user.update({
    where: { id: targetUserId },
    data:  { isAdmin: makeAdmin },
  })

  return { userId: targetUserId, isAdmin: makeAdmin }
}

// ─────────────────────────────────────────────────────────────────
// Admin credit top-up
// ─────────────────────────────────────────────────────────────────
export async function adminAddCredits(
  callerId: string,
  targetUserId: string,
  amount: number,
  description: string,
) {
  await assertAdmin(callerId)

  const user = await prisma.user.findUnique({ where: { id: targetUserId } })
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found')

  const balance = await addCredits(targetUserId, amount, description ?? `Admin top-up by ${callerId}`)
  logger.info({ callerId, targetUserId, amount }, 'Admin credits top-up')
  return { userId: targetUserId, newBalance: Number(balance.balance) }
}

// ─────────────────────────────────────────────────────────────────
// List all bookings (admin view)
// ─────────────────────────────────────────────────────────────────
export async function listAllBookings(callerId: string, page: number, limit: number, status?: string) {
  await assertAdmin(callerId)

  const where: any = status ? { status } : {}

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, status: true, totalParticipants: true,
        finalAmount: true, createdAt: true,
        event:     { select: { id: true, title: true } },
        initiator: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.booking.count({ where }),
  ])

  return { bookings, page, limit, total }
}

// ─────────────────────────────────────────────────────────────────
// Cancel event (admin)
// ─────────────────────────────────────────────────────────────────
export async function cancelEvent(callerId: string, eventId: string, reason: string) {
  await assertAdmin(callerId)

  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) throw new AppError(404, 'NOT_FOUND', 'Event not found')
  if (event.status === 'CANCELLED') throw new AppError(400, 'ALREADY_CANCELLED', 'Event already cancelled')

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: eventId },
      data:  { status: 'CANCELLED' },
    })

    // Cancel all active bookings for this event
    await tx.booking.updateMany({
      where:  { eventId, status: { in: ['PAYMENT_PENDING', 'CONFIRMED'] } },
      data:   { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason },
    })

    // Release seats
    await tx.eventSection.updateMany({
      where: { eventId },
      data:  { availableSeats: 0 },
    })
  })

  logger.info({ callerId, eventId, reason }, 'Admin cancelled event')
  return { eventId, status: 'CANCELLED' }
}
