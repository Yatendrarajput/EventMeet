import { Request, Response } from 'express'
import { asyncHandler } from '@/shared/middleware/errorHandler'
import { sendSuccess, sendCreated, sendPaginated } from '@/shared/utils/response'
import * as bookingsService from './bookings.service'

export const createBookingController = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingsService.createBooking(req.user!.sub, req.body)
  sendCreated(res, booking, 'Booking created — complete payment within 15 minutes')
})

export const confirmBookingController = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingsService.confirmBooking(req.user!.sub, req.params.id)
  sendSuccess(res, booking, 'Booking confirmed — tickets are being generated')
})

export const cancelBookingController = asyncHandler(async (req: Request, res: Response) => {
  await bookingsService.cancelBooking(req.user!.sub, req.params.id, req.body)
  sendSuccess(res, null, 'Booking cancelled')
})

export const listBookingsController = asyncHandler(async (req: Request, res: Response) => {
  const page  = Number(req.query.page)  || 1
  const limit = Number(req.query.limit) || 10
  const result = await bookingsService.listBookings(req.user!.sub, page, limit)
  sendPaginated(res, result.bookings, { page: result.page, limit: result.limit, total: result.total })
})

export const getBookingController = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingsService.getBooking(req.user!.sub, req.params.id)
  sendSuccess(res, booking)
})

export const getTicketController = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await bookingsService.getTicket(req.user!.sub, req.params.id)
  sendSuccess(res, ticket)
})
