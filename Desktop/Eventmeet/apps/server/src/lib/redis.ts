import Redis from 'ioredis'
import { config } from '@/config'
import { logger } from '@/shared/utils/logger'

// Primary Redis client — used for cache, locks, sessions, rate limiting
export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 10) return null
    return Math.min(times * 200, 2000)
  },
})

redis.on('connect', () => logger.info('Redis connected'))
redis.on('error', (err) => logger.error({ err }, 'Redis error'))
redis.on('reconnecting', () => logger.warn('Redis reconnecting'))

// Note: BullMQ uses its own bundled ioredis — do NOT share this client with BullMQ
// BullMQ queues are configured with { connection: { url: config.REDIS_URL } } instead

// ─────────────────────────────────────────────────────────────────
// Redis key registry — ALL keys must be defined here
// Naming: prefix:concern:id (colon separator, camelCase IDs)
// ─────────────────────────────────────────────────────────────────
export const RedisKeys = {
  // Cache
  eventsList: (city: string, category: string, dateFrom: string, dateTo: string, page: number) =>
    `cache:events:${city}:${category}:${dateFrom}:${dateTo}:${page}`,
  eventDetail: (eventId: string) => `cache:event:${eventId}`,
  eventSections: (eventId: string) => `cache:event:${eventId}:sections`,
  userProfile: (userId: string) => `cache:user:${userId}:profile`,

  // Distributed locks
  bookingLock: (bookingId: string) => `lock:booking:${bookingId}`,
  bookingPaymentLock: (bookingId: string) => `lock:booking:payment:${bookingId}`,
  seatLock: (eventId: string, sectionId: string) => `lock:seat:${eventId}:${sectionId}`,
  creditLock: (userId: string) => `lock:credit:${userId}`,

  // Auth
  refreshToken: (userId: string, tokenId: string) => `session:refresh:${userId}:${tokenId}`,
  jwtBlacklist: (jti: string) => `blacklist:jwt:${jti}`,
  emailVerify: (userId: string) => `verify:email:${userId}`,
  passwordReset: (userId: string) => `reset:password:${userId}`,

  // Rate limits
  rateLimitAuth: (ip: string) => `ratelimit:auth:${ip}`,
  rateLimitApi: (userId: string) => `ratelimit:api:${userId}`,
  rateLimitBooking: (userId: string) => `ratelimit:booking:${userId}`,
} as const

// TTLs in seconds
export const RedisTTL = {
  eventsList: 5 * 60,
  eventDetail: 5 * 60,
  eventSections: 5 * 60,
  userProfile: 10 * 60,
  bookingLock: 10 * 60,
  bookingPaymentLock: 5 * 60,
  seatLock: 30,
  creditLock: 10,
  refreshToken: 30 * 24 * 60 * 60,
  jwtBlacklist: 15 * 60,
  emailVerify: 24 * 60 * 60,
  passwordReset: 60 * 60,
} as const
