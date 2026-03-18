import { Request, Response } from 'express'
import { asyncHandler } from '@/shared/middleware/errorHandler'
import { sendSuccess, sendCreated } from '@/shared/utils/response'
import * as authService from './auth.service'

export const registerController = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, fullName } = req.body
  const result = await authService.register(email, password, fullName)
  sendCreated(res, result, 'Registration successful. Please verify your email.')
})

export const loginController = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body
  const result = await authService.login(email, password)
  sendSuccess(res, result, 'Login successful')
})

export const refreshController = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body
  const result = await authService.refresh(refreshToken)
  sendSuccess(res, result, 'Token refreshed')
})

export const logoutController = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body
  await authService.logout(req.user!.sub, req.user!.jti, refreshToken)
  sendSuccess(res, null, 'Logged out successfully')
})

export const verifyEmailController = asyncHandler(async (req: Request, res: Response) => {
  const { userId, token } = req.body
  await authService.verifyEmail(userId, token)
  sendSuccess(res, null, 'Email verified successfully')
})

export const forgotPasswordController = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body
  await authService.forgotPassword(email)
  sendSuccess(res, null, 'If this email is registered, a reset link has been sent')
})

export const resetPasswordController = asyncHandler(async (req: Request, res: Response) => {
  const { userId, token, password } = req.body
  await authService.resetPassword(userId, token, password)
  sendSuccess(res, null, 'Password reset successfully')
})
