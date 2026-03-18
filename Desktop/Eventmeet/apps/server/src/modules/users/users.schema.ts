import { z } from 'zod'

export const updateProfileBody = z.object({
  fullName:    z.string().min(2).max(100).optional(),
  username:    z.string().min(3).max(50).regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores').optional(),
  bio:         z.string().max(500).optional(),
  dateOfBirth: z.string().date('Invalid date — use YYYY-MM-DD').optional(),
  gender:      z.enum(['male', 'female', 'non-binary', 'prefer_not_to_say']).optional(),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number').optional(),
  city:        z.string().max(100).optional(),
  state:       z.string().max(100).optional(),
  interests:   z.array(z.string().max(50)).max(20).optional(),
  lookingFor:  z.array(z.string().max(50)).max(10).optional(),
})

export const userIdParams = z.object({
  id: z.string().uuid('Invalid user ID'),
})
