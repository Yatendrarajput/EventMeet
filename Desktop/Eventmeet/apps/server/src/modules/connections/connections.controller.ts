import { Request, Response } from 'express'
import { asyncHandler } from '@/shared/middleware/errorHandler'
import { sendSuccess, sendCreated, sendPaginated } from '@/shared/utils/response'
import * as connectionsService from './connections.service'

export const sendRequestController = asyncHandler(async (req: Request, res: Response) => {
  const result = await connectionsService.sendRequest(
    req.user!.sub,
    req.params.receiverId,
    req.params.eventId,
    req.body
  )
  const message = result.autoAccepted ? 'Connection accepted (mutual interest)' : 'Connection request sent'
  sendCreated(res, result.request, message)
})

export const respondToRequestController = asyncHandler(async (req: Request, res: Response) => {
  const updated = await connectionsService.respondToRequest(
    req.user!.sub,
    req.params.connectionId,
    req.body.action
  )
  const messages = { ACCEPT: 'Connection accepted', DECLINE: 'Connection declined', BLOCK: 'User blocked' }
  sendSuccess(res, updated, messages[req.body.action as keyof typeof messages])
})

export const removeConnectionController = asyncHandler(async (req: Request, res: Response) => {
  await connectionsService.removeConnection(req.user!.sub, req.params.connectionId)
  sendSuccess(res, null, 'Connection removed')
})

export const listConnectionsController = asyncHandler(async (req: Request, res: Response) => {
  const page  = Number(req.query.page)  || 1
  const limit = Number(req.query.limit) || 10
  const result = await connectionsService.listConnections(req.user!.sub, page, limit)
  sendPaginated(res, result.connections, { page: result.page, limit: result.limit, total: result.total })
})

export const listPendingRequestsController = asyncHandler(async (req: Request, res: Response) => {
  const page  = Number(req.query.page)  || 1
  const limit = Number(req.query.limit) || 10
  const result = await connectionsService.listPendingRequests(req.user!.sub, page, limit)
  sendPaginated(res, result.requests, { page: result.page, limit: result.limit, total: result.total })
})

export const listSentRequestsController = asyncHandler(async (req: Request, res: Response) => {
  const page  = Number(req.query.page)  || 1
  const limit = Number(req.query.limit) || 10
  const result = await connectionsService.listSentRequests(req.user!.sub, page, limit)
  sendPaginated(res, result.requests, { page: result.page, limit: result.limit, total: result.total })
})
