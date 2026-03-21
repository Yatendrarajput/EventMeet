import { EventCategory, EventStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { redis, RedisKeys, RedisTTL } from '@/lib/redis'
import { AppError } from '@/shared/middleware/errorHandler'
import type { EventListQuery, CreateEventInput, UpdateEventInput, SetAvailabilityInput } from './events.types'

// ─────────────────────────────────────────────────────────────────
// List events (paginated + filtered, Redis cached)
// ─────────────────────────────────────────────────────────────────
export async function listEvents(query: Required<EventListQuery>) {
  const { city, category, dateFrom, dateTo, page, limit } = query

  const cacheKey = RedisKeys.eventsList(
    city ?? '',
    category ?? '',
    dateFrom ?? '',
    dateTo ?? '',
    page
  )

  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const where: Prisma.EventWhereInput = {
    status: EventStatus.PUBLISHED,
    deletedAt: null,
    ...(category && { category: category as EventCategory }),
    ...(dateFrom || dateTo
      ? {
          startDatetime: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo   && { lte: new Date(dateTo + 'T23:59:59Z') }),
          },
        }
      : {}),
    ...(city && { venue: { city: { contains: city, mode: 'insensitive' as const } } }),
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startDatetime: 'asc' },
      select: {
        id: true, title: true, category: true, status: true,
        startDatetime: true, endDatetime: true, basePrice: true,
        bannerUrl: true, tags: true, viewCount: true, createdAt: true,
        venue: { select: { id: true, name: true, city: true, state: true } },
        sections: { select: { id: true, name: true, availableSeats: true, pricePerSeat: true }, orderBy: { displayOrder: 'asc' } },
        _count: { select: { availability: true } },
      },
    }),
    prisma.event.count({ where }),
  ])

  const result = { events, total, page, limit }
  await redis.setex(cacheKey, RedisTTL.eventsList, JSON.stringify(result))
  return result
}

// ─────────────────────────────────────────────────────────────────
// Event detail (Redis cached, increments viewCount)
// ─────────────────────────────────────────────────────────────────
export async function getEventById(eventId: string) {
  const cacheKey = RedisKeys.eventDetail(eventId)
  const cached = await redis.get(cacheKey)
  if (cached) {
    // Increment viewCount asynchronously — don't block response
    prisma.event.update({ where: { id: eventId }, data: { viewCount: { increment: 1 } } }).catch(() => {})
    return JSON.parse(cached)
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, deletedAt: null },
    select: {
      id: true, title: true, description: true, category: true, status: true,
      startDatetime: true, endDatetime: true, doorsOpenAt: true,
      basePrice: true, bannerUrl: true, images: true, tags: true, viewCount: true,
      createdAt: true, updatedAt: true,
      venue: { select: { id: true, name: true, addressLine1: true, addressLine2: true, city: true, state: true, pincode: true, latitude: true, longitude: true, googleMapsUrl: true } },
      creator: { select: { id: true, fullName: true, avatarUrl: true } },
      sections: { select: { id: true, name: true, totalSeats: true, availableSeats: true, pricePerSeat: true, displayOrder: true }, orderBy: { displayOrder: 'asc' } },
      _count: { select: { availability: true, bookings: true } },
    },
  })

  if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')

  await redis.setex(cacheKey, RedisTTL.eventDetail, JSON.stringify(event))
  prisma.event.update({ where: { id: eventId }, data: { viewCount: { increment: 1 } } }).catch(() => {})

  return event
}

// ─────────────────────────────────────────────────────────────────
// Set user availability for an event
// ─────────────────────────────────────────────────────────────────
export async function setAvailability(userId: string, eventId: string, input: SetAvailabilityInput) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, status: EventStatus.PUBLISHED, deletedAt: null },
    select: { id: true, startDatetime: true },
  })

  if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found or not published')

  if (new Date() > event.startDatetime) {
    throw new AppError(400, 'EVENT_STARTED', 'Cannot set availability for a past event')
  }

  // Availability expires 1 hour before event starts
  const expiresAt = new Date(event.startDatetime.getTime() - 60 * 60 * 1000)

  const availability = await prisma.eventAvailability.upsert({
    where: { userId_eventId: { userId, eventId } },
    create: { userId, eventId, note: input.note, expiresAt, status: 'ACTIVE' },
    update: { note: input.note, status: 'ACTIVE', expiresAt },
    select: { id: true, userId: true, eventId: true, status: true, note: true, expiresAt: true, createdAt: true },
  })

  return availability
}

// ─────────────────────────────────────────────────────────────────
// Remove user availability
// ─────────────────────────────────────────────────────────────────
export async function removeAvailability(userId: string, eventId: string) {
  const existing = await prisma.eventAvailability.findUnique({
    where: { userId_eventId: { userId, eventId } },
    select: { id: true, status: true },
  })

  if (!existing) throw new AppError(404, 'AVAILABILITY_NOT_FOUND', 'Availability not set for this event')

  await prisma.eventAvailability.update({
    where: { userId_eventId: { userId, eventId } },
    data: { status: 'CANCELLED' },
  })
}

// ─────────────────────────────────────────────────────────────────
// Get users available for an event (social discovery)
// ─────────────────────────────────────────────────────────────────
export async function getAvailableUsers(viewerId: string, eventId: string, page: number, limit: number) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, status: EventStatus.PUBLISHED, deletedAt: null },
    select: { id: true },
  })

  if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')

  // Get IDs of users who have blocked viewer or been blocked by viewer
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  })
  const blockedIds = new Set(blocks.flatMap(b => [b.blockerId, b.blockedId]))
  blockedIds.delete(viewerId) // remove self

  const where: Prisma.EventAvailabilityWhereInput = {
    eventId,
    status: 'ACTIVE',
    userId: { not: viewerId, notIn: [...blockedIds] },
    user: { isActive: true, deletedAt: null },
  }

  const [availability, total] = await Promise.all([
    prisma.eventAvailability.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, note: true, createdAt: true,
        user: { select: { id: true, fullName: true, username: true, avatarUrl: true, city: true, interests: true, lookingFor: true, averageRating: true, isVerified: true } },
      },
    }),
    prisma.eventAvailability.count({ where }),
  ])

  return { users: availability, total, page, limit }
}

// ─────────────────────────────────────────────────────────────────
// Admin — create event with sections
// ─────────────────────────────────────────────────────────────────
export async function createEvent(createdBy: string, input: CreateEventInput) {
  const venue = await prisma.venue.findUnique({ where: { id: input.venueId }, select: { id: true } })
  if (!venue) throw new AppError(404, 'VENUE_NOT_FOUND', 'Venue not found')

  if (new Date(input.startDatetime) >= new Date(input.endDatetime)) {
    throw new AppError(400, 'INVALID_DATES', 'Start datetime must be before end datetime')
  }

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({
      data: {
        title: input.title,
        description: input.description,
        category: input.category as EventCategory,
        status: EventStatus.DRAFT,
        venueId: input.venueId,
        startDatetime: new Date(input.startDatetime),
        endDatetime: new Date(input.endDatetime),
        doorsOpenAt: input.doorsOpenAt ? new Date(input.doorsOpenAt) : undefined,
        basePrice: input.basePrice,
        bannerUrl: input.bannerUrl,
        tags: input.tags ?? [],
        createdBy,
      },
    })

    await tx.eventSection.createMany({
      data: input.sections.map((s, i) => ({
        eventId: created.id,
        name: s.name,
        totalSeats: s.totalSeats,
        availableSeats: s.totalSeats,
        pricePerSeat: s.pricePerSeat ?? input.basePrice,
        displayOrder: s.displayOrder ?? i,
      })),
    })

    return tx.event.findUnique({
      where: { id: created.id },
      select: {
        id: true, title: true, category: true, status: true,
        startDatetime: true, endDatetime: true, basePrice: true, createdAt: true,
        sections: { select: { id: true, name: true, totalSeats: true, pricePerSeat: true, displayOrder: true } },
      },
    })
  })

  return event
}

// ─────────────────────────────────────────────────────────────────
// Admin — update event
// ─────────────────────────────────────────────────────────────────
export async function updateEvent(eventId: string, input: UpdateEventInput) {
  const existing = await prisma.event.findFirst({
    where: { id: eventId, deletedAt: null },
    select: { id: true, status: true },
  })

  if (!existing) throw new AppError(404, 'EVENT_NOT_FOUND', 'Event not found')

  if (existing.status === EventStatus.CANCELLED) {
    throw new AppError(400, 'EVENT_CANCELLED', 'Cannot update a cancelled event')
  }

  const data: Prisma.EventUpdateInput = {
    ...( input.title          && { title: input.title }),
    ...( input.description    !== undefined && { description: input.description }),
    ...( input.status         && { status: input.status as EventStatus }),
    ...( input.startDatetime  && { startDatetime: new Date(input.startDatetime) }),
    ...( input.endDatetime    && { endDatetime: new Date(input.endDatetime) }),
    ...( input.doorsOpenAt    && { doorsOpenAt: new Date(input.doorsOpenAt) }),
    ...( input.basePrice      !== undefined && { basePrice: input.basePrice }),
    ...( input.bannerUrl      && { bannerUrl: input.bannerUrl }),
    ...( input.tags           && { tags: input.tags }),
    ...(input.status === 'CANCELLED' && {
      cancelledAt: new Date(),
      cancellationReason: input.cancellationReason,
    }),
  }

  const event = await prisma.event.update({
    where: { id: eventId },
    data,
    select: { id: true, title: true, status: true, updatedAt: true },
  })

  // Invalidate caches
  await redis.del(RedisKeys.eventDetail(eventId))

  return event
}
