import { z } from 'zod'

export const createRatingBody = z.object({
  ratedUserId: z.string().uuid(),
  eventId:     z.string().uuid(),
  bookingId:   z.string().uuid(),
  score:       z.number().int().min(1).max(5),
  tags:        z.array(z.string().max(50)).max(5).optional().default([]),
  review:      z.string().max(1000).optional(),
})
