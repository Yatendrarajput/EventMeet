import { Request, Response } from 'express'
import { asyncHandler } from '@/shared/middleware/errorHandler'
import { sendSuccess, sendCreated } from '@/shared/utils/response'
import { AppError } from '@/shared/middleware/errorHandler'
import * as usersService from './users.service'

export const getMeController = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.getMe(req.user!.sub)
  sendSuccess(res, user)
})

export const updateMeController = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.updateMe(req.user!.sub, req.body)
  sendSuccess(res, user, 'Profile updated')
})

export const getUserByIdController = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.getUserById(req.user!.sub, req.params.id)
  sendSuccess(res, user)
})

export const deleteMeController = asyncHandler(async (req: Request, res: Response) => {
  await usersService.deleteMe(req.user!.sub)
  sendSuccess(res, null, 'Account deleted')
})

export const uploadAvatarController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(400, 'NO_FILE', 'No image file provided')
  }
  const result = await usersService.uploadAvatar(req.user!.sub, req.file.buffer, req.file.mimetype)
  sendCreated(res, result, 'Avatar uploaded successfully')
})
