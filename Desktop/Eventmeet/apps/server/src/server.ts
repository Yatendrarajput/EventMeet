import 'dotenv/config'
import http from 'http'
import { createApp } from '@/app'
import { config } from '@/config'
import { logger } from '@/shared/utils/logger'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { initSocket } from '@/lib/socket'

async function bootstrap() {
  // Verify DB connection
  await prisma.$connect()
  logger.info('PostgreSQL connected')

  // Connect Redis
  await redis.connect()

  const app = createApp()
  const httpServer = http.createServer(app)

  // Initialize Socket.io with Redis adapter
  initSocket(httpServer)

  httpServer.listen(config.PORT, () => {
    logger.info(`EventMeet server running on port ${config.PORT} [${config.NODE_ENV}]`)
    logger.info(`Health: http://localhost:${config.PORT}/health`)
    logger.info(`API:    http://localhost:${config.PORT}/v1`)
  })

  // ── Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`)
    httpServer.close(async () => {
      await prisma.$disconnect()
      redis.disconnect()
      logger.info('Server shut down cleanly')
      process.exit(0)
    })
    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => process.exit(1), 10_000)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception')
    process.exit(1)
  })
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection')
    process.exit(1)
  })
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
