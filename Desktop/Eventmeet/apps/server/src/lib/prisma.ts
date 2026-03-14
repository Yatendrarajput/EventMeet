import { PrismaClient } from '@prisma/client'
import { logger } from '@/shared/utils/logger'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
        : ['warn', 'error'],
  })

if (process.env.NODE_ENV === 'development') {
  // Log slow queries in development
  prisma.$on('query' as never, (e: { query: string; duration: number }) => {
    if (e.duration > 500) {
      logger.warn({ query: e.query, duration: e.duration }, 'Slow query detected')
    }
  })
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
