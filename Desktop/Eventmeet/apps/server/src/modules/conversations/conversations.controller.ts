import { Request, Response } from 'express'
import { asyncHandler } from '@/shared/middleware/errorHandler'
import { sendSuccess, sendCreated, sendPaginated } from '@/shared/utils/response'
import * as conversationsService from './conversations.service'

export const createConversationController = asyncHandler(async (req: Request, res: Response) => {
  const conversation = await conversationsService.createConversation(req.user!.sub, req.body)
  sendCreated(res, conversation, 'Conversation created')
})

export const listConversationsController = asyncHandler(async (req: Request, res: Response) => {
  const page  = Number(req.query.page)  || 1
  const limit = Number(req.query.limit) || 20
  const result = await conversationsService.listConversations(req.user!.sub, page, limit)
  sendPaginated(res, result.conversations, { page: result.page, limit: result.limit, total: result.total })
})

export const getConversationController = asyncHandler(async (req: Request, res: Response) => {
  const conversation = await conversationsService.getConversation(req.user!.sub, req.params.id)
  sendSuccess(res, conversation)
})

export const getMessagesController = asyncHandler(async (req: Request, res: Response) => {
  const page  = Number(req.query.page)  || 1
  const limit = Number(req.query.limit) || 50
  const result = await conversationsService.getMessages(req.user!.sub, req.params.id, page, limit)
  sendPaginated(res, result.messages, { page: result.page, limit: result.limit, total: result.total })
})

export const sendMessageController = asyncHandler(async (req: Request, res: Response) => {
  const message = await conversationsService.sendMessage(req.user!.sub, req.params.id, req.body)
  sendCreated(res, message, 'Message sent')
})

export const deleteMessageController = asyncHandler(async (req: Request, res: Response) => {
  await conversationsService.deleteMessage(req.user!.sub, req.params.id, req.params.messageId)
  sendSuccess(res, null, 'Message deleted')
})

export const leaveConversationController = asyncHandler(async (req: Request, res: Response) => {
  await conversationsService.leaveConversation(req.user!.sub, req.params.id)
  sendSuccess(res, null, 'Left conversation')
})
