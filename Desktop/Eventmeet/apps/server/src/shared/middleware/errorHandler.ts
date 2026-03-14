import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { logger } from '@/shared/utils/logger'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // AppError — known operational errors
  if (err instanceof AppError) {
    const body: Record<string, unknown> = { code: err.code, message: err.message }
    if (err.details !== undefined) body.details = err.details
    res.status(err.statusCode).json({ success: false, error: body })
    return
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.flatten().fieldErrors,
      },
    })
    return
  }

  // Prisma known errors
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const fields = (err.meta?.target as string[]) ?? []
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: `${fields.join(', ')} already exists` },
      })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Record not found' },
      })
      return
    }
  }

  // Unknown errors — log and return generic 500
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error')

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  })
}

// Async handler wrapper — eliminates try/catch boilerplate in controllers
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
