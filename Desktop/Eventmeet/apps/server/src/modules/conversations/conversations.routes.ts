import { Router } from 'express'
import { authenticate } from '@/shared/middleware/authenticate'
import { validate }     from '@/shared/middleware/validate'
import * as schema      from './conversations.schema'
import * as controller  from './conversations.controller'

export const conversationsRouter = Router()

conversationsRouter.use(authenticate)

// Conversation CRUD
conversationsRouter.post('/',    validate({ body: schema.createConversationBody }), controller.createConversationController)
conversationsRouter.get('/',     controller.listConversationsController)
conversationsRouter.get('/:id',  controller.getConversationController)
conversationsRouter.delete('/:id/leave', controller.leaveConversationController)

// Messages
conversationsRouter.get('/:id/messages',                   controller.getMessagesController)
conversationsRouter.post('/:id/messages',  validate({ body: schema.sendMessageBody }), controller.sendMessageController)
conversationsRouter.delete('/:id/messages/:messageId',     controller.deleteMessageController)
