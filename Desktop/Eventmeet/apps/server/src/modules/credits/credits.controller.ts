import { Request, Response } from 'express'
import { asyncHandler }      from '@/shared/middleware/errorHandler'
import { sendSuccess, sendPaginated } from '@/shared/utils/response'
import * as creditsService   from './credits.service'

export const getBalanceController = asyncHandler(async (req: Request, res: Response) => {
  const balance = await creditsService.getBalance(req.user!.sub)
  sendSuccess(res, balance)
})

export const getTransactionsController = asyncHandler(async (req: Request, res: Response) => {
  const page   = Number(req.query.page)  || 1
  const limit  = Number(req.query.limit) || 10
  const result = await creditsService.getTransactions(req.user!.sub, page, limit)
  sendPaginated(res, result.transactions, { page: result.page, limit: result.limit, total: result.total })
})
