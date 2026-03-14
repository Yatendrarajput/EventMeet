import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

// Validates req.body, req.params, and req.query against Zod schemas
export function validate(schemas: {
  body?: ZodSchema
  params?: ZodSchema
  query?: ZodSchema
}) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body)
      if (!result.success) return next(result.error)
      req.body = result.data
    }
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params)
      if (!result.success) return next(result.error)
      req.params = result.data
    }
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query)
      if (!result.success) return next(result.error)
      req.query = result.data
    }
    next()
  }
}
