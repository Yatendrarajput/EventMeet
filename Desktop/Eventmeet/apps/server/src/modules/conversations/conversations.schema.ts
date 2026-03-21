import { z } from 'zod'

export const createConversationBody = z.object({
  type:      z.enum(['DIRECT', 'GROUP']),
  eventId:   z.string().uuid(),
  name:      z.string().max(100).optional(),
  memberIds: z.array(z.string().uuid()).min(1).max(14),
})

export const sendMessageBody = z.object({
  content: z.string().min(1).max(5000).trim(),
  type:    z.enum(['TEXT']).optional().default('TEXT'),
})
