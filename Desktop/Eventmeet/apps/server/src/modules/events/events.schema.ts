import { z } from 'zod'

export const eventListQuery = z.object({
  city:     z.string().max(100).optional(),
  category: z.enum(['COMEDY', 'MUSIC', 'THEATER', 'SPORTS', 'TECH', 'ART', 'FOOD', 'OTHER']).optional(),
  dateFrom: z.string().date('Use YYYY-MM-DD').optional(),
  dateTo:   z.string().date('Use YYYY-MM-DD').optional(),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(50).default(10),
})

export const eventIdParams = z.object({
  id: z.string().uuid('Invalid event ID'),
})

const sectionSchema = z.object({
  name:         z.string().min(1).max(100),
  totalSeats:   z.number().int().min(1),
  pricePerSeat: z.number().min(0).optional(),
  displayOrder: z.number().int().min(0).optional(),
})

export const createEventBody = z.object({
  title:         z.string().min(3).max(255),
  description:   z.string().max(5000).optional(),
  category:      z.enum(['COMEDY', 'MUSIC', 'THEATER', 'SPORTS', 'TECH', 'ART', 'FOOD', 'OTHER']),
  venueId:       z.string().uuid('Invalid venue ID'),
  startDatetime: z.string().datetime('Use ISO 8601 datetime'),
  endDatetime:   z.string().datetime('Use ISO 8601 datetime'),
  doorsOpenAt:   z.string().datetime().optional(),
  basePrice:     z.number().min(0),
  bannerUrl:     z.string().url().optional(),
  tags:          z.array(z.string().max(50)).max(20).optional(),
  sections:      z.array(sectionSchema).min(1, 'At least one section is required'),
})

export const updateEventBody = z.object({
  title:              z.string().min(3).max(255).optional(),
  description:        z.string().max(5000).optional(),
  status:             z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']).optional(),
  startDatetime:      z.string().datetime().optional(),
  endDatetime:        z.string().datetime().optional(),
  doorsOpenAt:        z.string().datetime().optional(),
  basePrice:          z.number().min(0).optional(),
  bannerUrl:          z.string().url().optional(),
  tags:               z.array(z.string().max(50)).max(20).optional(),
  cancellationReason: z.string().max(1000).optional(),
})

export const setAvailabilityBody = z.object({
  note: z.string().max(300).optional(),
})
