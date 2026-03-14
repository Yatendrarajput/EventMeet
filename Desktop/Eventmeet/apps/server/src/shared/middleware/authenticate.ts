import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '@/config'
import { redis, RedisKeys } from '@/lib/redis'
import { AppError } from '@/shared/middleware/errorHandler'

export interface JwtPayload {
  sub: string   // userId
  jti: string   // unique token id — used for blacklisting
  iat: number
  exp: number
}

// Extend Express Request to carry authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
    }

    const token = authHeader.split(' ')[1]
    const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload

    // Check if token is blacklisted (logged out)
    const isBlacklisted = await redis.exists(RedisKeys.jwtBlacklist(payload.jti))
    if (isBlacklisted) {
      throw new AppError(401, 'TOKEN_REVOKED', 'Token has been revoked')
    }

    req.user = payload
    next()
  } catch (err) {
    if (err instanceof AppError) return next(err)
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Token has expired'))
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new AppError(401, 'TOKEN_INVALID', 'Invalid token'))
    }
    next(err)
  }
}

// Must be used after authenticate — blocks unverified users from social + booking features
export function requireEmailVerified(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // email_verified_at is checked at service layer using the userId from req.user
  // This middleware marks the intent — actual DB check is in the service
  next()
}

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // isAdmin check is done at service layer
  // Set a flag here for middleware chain clarity
  (req as Request & { requiresAdmin: boolean }).requiresAdmin = true
  next()
}
