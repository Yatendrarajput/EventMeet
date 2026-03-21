import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { redis, RedisKeys, RedisTTL } from '@/lib/redis'
import { config } from '@/config'
import { logger } from '@/shared/utils/logger'
import { AppError } from '@/shared/middleware/errorHandler'
import type { JwtPayload } from '@/shared/middleware/authenticate'
import type { AuthTokens, AuthUser } from './auth.types'

// ─────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────

function issueTokens(userId: string): AuthTokens {
  const accessJti = uuidv4()
  const refreshJti = uuidv4()

  const accessToken = jwt.sign(
    { sub: userId, jti: accessJti },
    config.JWT_ACCESS_SECRET,
    { expiresIn: config.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions
  )

  const refreshToken = jwt.sign(
    { sub: userId, jti: refreshJti },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
  )

  return { accessToken, refreshToken }
}

async function storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
  const { jti } = jwt.decode(refreshToken) as JwtPayload
  await redis.setex(RedisKeys.refreshToken(userId, jti), RedisTTL.refreshToken, refreshToken)
}

// ─────────────────────────────────────────────────────────────────
// Service methods
// ─────────────────────────────────────────────────────────────────

export async function register(
  email: string,
  password: string,
  fullName: string
): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new AppError(409, 'EMAIL_EXISTS', 'Email is already registered')
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email, passwordHash, fullName },
      select: { id: true, email: true, fullName: true, isVerified: true, emailVerifiedAt: true },
    })
    await tx.creditBalance.create({ data: { userId: created.id } })
    return created
  })

  // Store email verification token in Redis (24h TTL)
  const verifyToken = crypto.randomBytes(32).toString('hex')
  await redis.setex(RedisKeys.emailVerify(user.id), RedisTTL.emailVerify, verifyToken)

  // TODO: replace with AWS SES email when configured
  logger.info({ userId: user.id, verifyToken }, 'Email verification token (dev)')

  const tokens = issueTokens(user.id)
  await storeRefreshToken(user.id, tokens.refreshToken)

  return { user, tokens }
}

export async function login(
  email: string,
  password: string
): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  const found = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      fullName: true,
      passwordHash: true,
      isVerified: true,
      emailVerifiedAt: true,
      isActive: true,
      deletedAt: true,
    },
  })

  if (!found || found.deletedAt) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
  }

  if (!found.isActive) {
    throw new AppError(403, 'ACCOUNT_INACTIVE', 'Your account has been deactivated')
  }

  const valid = await bcrypt.compare(password, found.passwordHash)
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
  }

  await prisma.user.update({ where: { id: found.id }, data: { lastLoginAt: new Date() } })

  const tokens = issueTokens(found.id)
  await storeRefreshToken(found.id, tokens.refreshToken)

  const { passwordHash: _h, isActive: _a, deletedAt: _d, ...safeUser } = found
  return { user: safeUser, tokens }
}

export async function refresh(refreshToken: string): Promise<{ accessToken: string }> {
  let payload: JwtPayload
  try {
    payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as JwtPayload
  } catch {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token')
  }

  const stored = await redis.get(RedisKeys.refreshToken(payload.sub, payload.jti))
  if (!stored) {
    throw new AppError(401, 'REFRESH_TOKEN_EXPIRED', 'Session expired, please log in again')
  }

  const accessJti = uuidv4()
  const accessToken = jwt.sign(
    { sub: payload.sub, jti: accessJti },
    config.JWT_ACCESS_SECRET,
    { expiresIn: config.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions
  )

  return { accessToken }
}

export async function logout(
  userId: string,
  accessJti: string,
  refreshToken?: string
): Promise<void> {
  // Blacklist the current access token for its remaining TTL (15m)
  await redis.setex(RedisKeys.jwtBlacklist(accessJti), RedisTTL.jwtBlacklist, '1')

  // Remove the refresh token from Redis so it can't be used again
  if (refreshToken) {
    try {
      const { jti } = jwt.decode(refreshToken) as JwtPayload
      if (jti) await redis.del(RedisKeys.refreshToken(userId, jti))
    } catch {
      // Safe to ignore — logout succeeds even if refresh token is malformed
    }
  }
}

export async function verifyEmail(userId: string, token: string): Promise<void> {
  const stored = await redis.get(RedisKeys.emailVerify(userId))
  if (!stored || stored !== token) {
    throw new AppError(400, 'INVALID_VERIFY_TOKEN', 'Invalid or expired verification token')
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date(), isVerified: true },
  })

  await redis.del(RedisKeys.emailVerify(userId))
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })

  // Always return success to prevent email enumeration
  if (!user) return

  const resetToken = crypto.randomBytes(32).toString('hex')
  await redis.setex(RedisKeys.passwordReset(user.id), RedisTTL.passwordReset, resetToken)

  // TODO: replace with AWS SES email when configured
  logger.info({ userId: user.id, resetToken }, 'Password reset token (dev)')
}

export async function resetPassword(
  userId: string,
  token: string,
  newPassword: string
): Promise<void> {
  const stored = await redis.get(RedisKeys.passwordReset(userId))
  if (!stored || stored !== token) {
    throw new AppError(400, 'INVALID_RESET_TOKEN', 'Invalid or expired reset token')
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
  await redis.del(RedisKeys.passwordReset(userId))
}
