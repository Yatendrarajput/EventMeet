import { Request, Response } from 'express'
import { asyncHandler }      from '@/shared/middleware/errorHandler'
import { sendSuccess, sendCreated, sendPaginated } from '@/shared/utils/response'
import * as ratingsService   from './ratings.service'

export const createRatingController = asyncHandler(async (req: Request, res: Response) => {
  const rating = await ratingsService.createRating(req.user!.sub, req.body)
  sendCreated(res, rating, 'Rating submitted successfully')
})

export const getUserRatingsController = asyncHandler(async (req: Request, res: Response) => {
  const page   = Number(req.query.page)  || 1
  const limit  = Number(req.query.limit) || 10
  const result = await ratingsService.getUserRatings(req.params.userId, page, limit)
  sendPaginated(res, result.ratings, {
    page:  result.page,
    limit: result.limit,
    total: result.total,
    extra: { averageScore: result.averageScore, totalRatings: result.totalRatings },
  })
})

export const getMyGivenRatingsController = asyncHandler(async (req: Request, res: Response) => {
  const page   = Number(req.query.page)  || 1
  const limit  = Number(req.query.limit) || 10
  const result = await ratingsService.getMyGivenRatings(req.user!.sub, page, limit)
  sendPaginated(res, result.ratings, { page: result.page, limit: result.limit, total: result.total })
})

export const checkCanRateController = asyncHandler(async (req: Request, res: Response) => {
  const { userId, bookingId } = req.params
  const result = await ratingsService.checkCanRate(req.user!.sub, userId, bookingId)
  sendSuccess(res, result)
})
