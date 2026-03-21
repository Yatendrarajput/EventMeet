import { z } from 'zod'

export const createBookingBody = z.object({
  eventId:      z.string().uuid(),
  sectionId:    z.string().uuid(),
  participants: z.array(z.string().uuid()).max(13).optional().default([]),
})

export const cancelBookingBody = z.object({
  reason: z.string().max(500).optional(),
})
