import { z } from 'zod'

export const registerBody = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  fullName: z.string().min(2, 'Full name is required').max(100),
})

export const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
})

export const refreshBody = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

export const logoutBody = z.object({
  refreshToken: z.string().optional(),
})

export const verifyEmailBody = z.object({
  userId: z.string().uuid('Invalid user ID'),
  token: z.string().min(1, 'Token is required'),
})

export const forgotPasswordBody = z.object({
  email: z.string().email('Invalid email address'),
})

export const resetPasswordBody = z.object({
  userId: z.string().uuid('Invalid user ID'),
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
})
