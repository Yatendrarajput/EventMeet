import { Queue } from 'bullmq'
import { config } from '@/config'
import { logger } from '@/shared/utils/logger'

// BullMQ bundles its own ioredis — pass URL connection config, not a shared Redis instance
// This avoids the dual ioredis version conflict
const connection = { url: config.REDIS_URL }

// ─────────────────────────────────────────────────────────────────
// Queue definitions — one queue per concern
// ─────────────────────────────────────────────────────────────────

export const Queues = {
  TICKETS: 'tickets',
  EMAILS: 'emails',
  REFUNDS: 'refunds',
  AVAILABILITY_EXPIRY: 'availability-expiry',
  BOOKING_EXPIRY: 'booking-expiry',
  RATING_REMINDER: 'rating-reminder',
  CACHE_INVALIDATE: 'cache-invalidate',
} as const

// Job type definitions
export type TicketJobData = {
  bookingId: string
  userIds: string[]
}

export type EmailJobData = {
  type: 'BOOKING_CONFIRM' | 'TICKET_DELIVERY' | 'PASSWORD_RESET' | 'EMAIL_VERIFY' | 'REFUND'
  to: string
  data: Record<string, unknown>
}

export type RefundJobData = {
  bookingId: string
  reason: string
}

export type CacheInvalidateJobData = {
  keys: string[]
}

// Queue instances
export const ticketQueue = new Queue(Queues.TICKETS, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
})

export const emailQueue = new Queue(Queues.EMAILS, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
})

export const refundQueue = new Queue(Queues.REFUNDS, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
})

export const cacheInvalidateQueue = new Queue(Queues.CACHE_INVALIDATE, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: 50,
    removeOnFail: 100,
  },
})

// Log queue errors — workers are registered in separate worker files
const queues = [ticketQueue, emailQueue, refundQueue, cacheInvalidateQueue]
queues.forEach((q) => {
  q.on('error', (err) => logger.error({ queue: q.name, err }, 'Queue error'))
})

logger.info('BullMQ queues initialized')
