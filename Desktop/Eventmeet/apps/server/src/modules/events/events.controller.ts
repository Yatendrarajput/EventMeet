import { Request, Response } from 'express'
import { asyncHandler } from '@/shared/middleware/errorHandler'
import { sendSuccess, sendCreated, sendPaginated } from '@/shared/utils/response'
import * as eventsService from './events.service'

export const listEventsController = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as Record<string, string>
  const result = await eventsService.listEvents({
    city:     query.city,
    category: query.category,
    dateFrom: query.dateFrom,
    dateTo:   query.dateTo,
    page:     Number(query.page)  || 1,
    limit:    Number(query.limit) || 10,
  })
  sendPaginated(res, result.events, { page: result.page, limit: result.limit, total: result.total })
})

export const getEventByIdController = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventsService.getEventById(req.params.id)
  sendSuccess(res, event)
})

export const setAvailabilityController = asyncHandler(async (req: Request, res: Response) => {
  const availability = await eventsService.setAvailability(req.user!.sub, req.params.id, req.body)
  sendCreated(res, availability, 'Availability set successfully')
})

export const removeAvailabilityController = asyncHandler(async (req: Request, res: Response) => {
  await eventsService.removeAvailability(req.user!.sub, req.params.id)
  sendSuccess(res, null, 'Availability removed')
})

export const getAvailableUsersController = asyncHandler(async (req: Request, res: Response) => {
  const page  = Number(req.query.page)  || 1
  const limit = Number(req.query.limit) || 10
  const result = await eventsService.getAvailableUsers(req.user!.sub, req.params.id, page, limit)
  sendPaginated(res, result.users, { page: result.page, limit: result.limit, total: result.total })
})

export const createEventController = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventsService.createEvent(req.user!.sub, req.body)
  sendCreated(res, event, 'Event created successfully')
})

export const updateEventController = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventsService.updateEvent(req.params.id, req.body)
  sendSuccess(res, event, 'Event updated successfully')
})
