import { Response } from 'express'

// ─────────────────────────────────────────────────────────────────
// Standard response format — ALL endpoints use these helpers
// Success:  { success: true, data, message }
// Error:    { success: false, error: { code, message, details } }
// Paginated: { success: true, data[], pagination: { page, limit, total, hasMore } }
// ─────────────────────────────────────────────────────────────────

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200
): Response {
  return res.status(statusCode).json({ success: true, message, data })
}

export function sendCreated<T>(res: Response, data: T, message = 'Created'): Response {
  return sendSuccess(res, data, message, 201)
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number },
  message = 'Success'
): Response {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      ...pagination,
      hasMore: pagination.page * pagination.limit < pagination.total,
    },
  })
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): Response {
  const error: Record<string, unknown> = { code, message }
  if (details !== undefined) error.details = details
  return res.status(statusCode).json({ success: false, error })
}

// Common error shortcuts
export const ApiError = {
  badRequest: (res: Response, message: string, details?: unknown) =>
    sendError(res, 400, 'BAD_REQUEST', message, details),

  unauthorized: (res: Response, message = 'Authentication required') =>
    sendError(res, 401, 'UNAUTHORIZED', message),

  forbidden: (res: Response, message = 'Forbidden') =>
    sendError(res, 403, 'FORBIDDEN', message),

  notFound: (res: Response, resource = 'Resource') =>
    sendError(res, 404, 'NOT_FOUND', `${resource} not found`),

  conflict: (res: Response, message: string) =>
    sendError(res, 409, 'CONFLICT', message),

  unprocessable: (res: Response, message: string, details?: unknown) =>
    sendError(res, 422, 'UNPROCESSABLE', message, details),

  tooManyRequests: (res: Response, message = 'Too many requests') =>
    sendError(res, 429, 'RATE_LIMITED', message),

  internal: (res: Response, message = 'Internal server error') =>
    sendError(res, 500, 'INTERNAL_ERROR', message),
}
