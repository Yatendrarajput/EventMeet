import { Request, Response } from 'express'
import { asyncHandler }      from '@/shared/middleware/errorHandler'
import { sendSuccess, sendPaginated } from '@/shared/utils/response'
import * as adminService from './admin.service'

export const getPlatformStatsController = asyncHandler(async (req: Request, res: Response) => {
  const stats = await adminService.getPlatformStats(req.user!.sub)
  sendSuccess(res, stats)
})

export const listUsersController = asyncHandler(async (req: Request, res: Response) => {
  const page       = Number(req.query.page)  || 1
  const limit      = Number(req.query.limit) || 20
  const search     = req.query.search as string | undefined
  const isVerified = req.query.isVerified !== undefined ? req.query.isVerified === 'true' : undefined
  const isAdmin    = req.query.isAdmin    !== undefined ? req.query.isAdmin    === 'true' : undefined
  const result = await adminService.listUsers(req.user!.sub, page, limit, search, isVerified, isAdmin)
  sendPaginated(res, result.users, { page: result.page, limit: result.limit, total: result.total })
})

export const banUserController = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.setUserBan(req.user!.sub, req.params.userId, true)
  sendSuccess(res, result, 'User banned')
})

export const unbanUserController = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.setUserBan(req.user!.sub, req.params.userId, false)
  sendSuccess(res, result, 'User unbanned')
})

export const setAdminController = asyncHandler(async (req: Request, res: Response) => {
  const { makeAdmin } = req.body
  const result = await adminService.setUserAdmin(req.user!.sub, req.params.userId, makeAdmin)
  sendSuccess(res, result, `User ${makeAdmin ? 'promoted to' : 'demoted from'} admin`)
})

export const addCreditsController = asyncHandler(async (req: Request, res: Response) => {
  const { userId, amount, description } = req.body
  const result = await adminService.adminAddCredits(req.user!.sub, userId, amount, description)
  sendSuccess(res, result, 'Credits added successfully')
})

export const listAllBookingsController = asyncHandler(async (req: Request, res: Response) => {
  const page   = Number(req.query.page)  || 1
  const limit  = Number(req.query.limit) || 20
  const status = req.query.status as string | undefined
  const result = await adminService.listAllBookings(req.user!.sub, page, limit, status)
  sendPaginated(res, result.bookings, { page: result.page, limit: result.limit, total: result.total })
})

export const cancelEventController = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body
  const result = await adminService.cancelEvent(req.user!.sub, req.params.eventId, reason)
  sendSuccess(res, result, 'Event cancelled and all bookings voided')
})
