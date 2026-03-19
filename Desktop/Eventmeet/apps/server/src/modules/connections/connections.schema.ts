import { z } from 'zod'

export const sendRequestBody = z.object({
  message:        z.string().max(500).optional(),
  isQuickConnect: z.boolean().optional().default(false),
})

export const respondBody = z.object({
  action: z.enum(['ACCEPT', 'DECLINE', 'BLOCK']),
})
