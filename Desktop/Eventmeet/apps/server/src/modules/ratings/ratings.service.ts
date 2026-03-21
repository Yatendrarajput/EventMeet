import { prisma }                         from '@/lib/prisma'
import { AppError }                       from '@/shared/middleware/errorHandler'
import { createNotification }             from '@/modules/notifications/notifications.service'
import type { CreateRatingInput }         from './ratings.types'

// ─────────────────────────────────────────────────────────────────
// Create rating
// ─────────────────────────────────────────────────────────────────
export async function createRating(raterId: string, input: CreateRatingInput) {
  const { ratedUserId, eventId, bookingId, score, tags = [], review } = input

  // Cannot rate yourself
  if (raterId === ratedUserId) throw new AppError(400, 'INVALID_RATING', 'You cannot rate yourself')

  // Verify the booking exists and rater was a participant
  const booking = await prisma.booking.findFirst({
    where: {
      id:      bookingId,
      eventId,
      status:  'CONFIRMED',
      OR: [
        { initiatedBy: raterId },
        { participants: { some: { userId: raterId } } },
      ],
    },
    include: { participants: { select: { userId: true } } },
  })
  if (!booking) throw new AppError(403, 'FORBIDDEN', 'You were not part of this confirmed booking')

  // Verify ratedUser was also in the same booking
  const ratedWasParticipant =
    booking.initiatedBy === ratedUserId ||
    booking.participants.some(p => p.userId === ratedUserId)
  if (!ratedWasParticipant) throw new AppError(400, 'INVALID_RATING', 'Rated user was not in your booking')

  // One rating per rater per booking
  const existing = await prisma.rating.findFirst({ where: { raterId, bookingId } })
  if (existing) throw new AppError(409, 'ALREADY_RATED', 'You have already rated this booking')

  // Create rating
  const rating = await prisma.rating.create({
    data: { raterId, ratedUserId, eventId, bookingId, score, tags, review },
  })

  // Update ratedUser's average rating
  const agg = await prisma.rating.aggregate({
    where:   { ratedUserId },
    _avg:    { score: true },
    _count:  { score: true },
  })

  await prisma.user.update({
    where: { id: ratedUserId },
    data: {
      averageRating: agg._avg.score ?? 0,
      totalRatings:  agg._count.score,
    },
  })

  // Notify rated user
  try {
    const rater = await prisma.user.findUnique({ where: { id: raterId }, select: { fullName: true } })
    await createNotification(ratedUserId, {
      type:    'RATING_REMINDER',
      title:   'You received a rating',
      body:    `${rater?.fullName ?? 'Someone'} rated you ${score}/5`,
      eventId,
      data:    { raterId, ratingId: rating.id, score },
    })
  } catch {
    // non-critical
  }

  return rating
}

// ─────────────────────────────────────────────────────────────────
// Get ratings received by a user
// ─────────────────────────────────────────────────────────────────
export async function getUserRatings(ratedUserId: string, page: number, limit: number) {
  const [ratings, total] = await Promise.all([
    prisma.rating.findMany({
      where:   { ratedUserId },
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, score: true, tags: true, review: true, createdAt: true,
        event:  { select: { id: true, title: true } },
        rater:  { select: { id: true, fullName: true, avatarUrl: true } },
      },
    }),
    prisma.rating.count({ where: { ratedUserId } }),
  ])

  const agg = await prisma.rating.aggregate({
    where:  { ratedUserId },
    _avg:   { score: true },
    _count: { score: true },
  })

  return {
    ratings,
    averageScore: agg._avg.score ? Number(agg._avg.score.toFixed(2)) : 0,
    totalRatings: agg._count.score,
    page,
    limit,
    total,
  }
}

// ─────────────────────────────────────────────────────────────────
// Get ratings given by me
// ─────────────────────────────────────────────────────────────────
export async function getMyGivenRatings(raterId: string, page: number, limit: number) {
  const [ratings, total] = await Promise.all([
    prisma.rating.findMany({
      where:   { raterId },
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, score: true, tags: true, review: true, createdAt: true,
        event:     { select: { id: true, title: true } },
        ratedUser: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    }),
    prisma.rating.count({ where: { raterId } }),
  ])

  return { ratings, page, limit, total }
}

// ─────────────────────────────────────────────────────────────────
// Check if I can rate a user (after confirmed booking together)
// ─────────────────────────────────────────────────────────────────
export async function checkCanRate(raterId: string, ratedUserId: string, bookingId: string) {
  if (raterId === ratedUserId) return { canRate: false, reason: 'Cannot rate yourself' }

  const existing = await prisma.rating.findFirst({ where: { raterId, bookingId } })
  if (existing) return { canRate: false, reason: 'Already rated', ratingId: existing.id }

  const booking = await prisma.booking.findFirst({
    where: {
      id:     bookingId,
      status: 'CONFIRMED',
      OR: [
        { initiatedBy: raterId },
        { participants: { some: { userId: raterId } } },
      ],
    },
    include: { participants: { select: { userId: true } } },
  })

  if (!booking) return { canRate: false, reason: 'No confirmed shared booking' }

  const ratedWasParticipant =
    booking.initiatedBy === ratedUserId ||
    booking.participants.some(p => p.userId === ratedUserId)

  return ratedWasParticipant
    ? { canRate: true }
    : { canRate: false, reason: 'Rated user was not in your booking' }
}
