import { Router }      from 'express'
import { authenticate } from '@/shared/middleware/authenticate'
import * as controller  from './credits.controller'

export const creditsRouter = Router()

creditsRouter.use(authenticate)

creditsRouter.get('/balance',      controller.getBalanceController)
creditsRouter.get('/transactions', controller.getTransactionsController)
