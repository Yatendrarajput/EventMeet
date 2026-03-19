import { Router } from 'express'
import { authenticate } from '@/shared/middleware/authenticate'
import { validate }     from '@/shared/middleware/validate'
import * as schema      from './connections.schema'
import * as controller  from './connections.controller'

export const connectionsRouter = Router()

// All connection routes require authentication
connectionsRouter.use(authenticate)

// Send a connection request (scoped to an event)
connectionsRouter.post(
  '/events/:eventId/users/:receiverId',
  validate({ body: schema.sendRequestBody }),
  controller.sendRequestController
)

// Respond to a request (accept / decline / block)
connectionsRouter.patch(
  '/:connectionId/respond',
  validate({ body: schema.respondBody }),
  controller.respondToRequestController
)

// Remove / withdraw a connection
connectionsRouter.delete('/:connectionId', controller.removeConnectionController)

// List my accepted connections
connectionsRouter.get('/', controller.listConnectionsController)

// List pending requests I received
connectionsRouter.get('/pending', controller.listPendingRequestsController)

// List requests I sent (still pending)
connectionsRouter.get('/sent', controller.listSentRequestsController)
