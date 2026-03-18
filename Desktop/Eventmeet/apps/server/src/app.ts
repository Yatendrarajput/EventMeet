import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import rateLimit from 'express-rate-limit'
import { config } from '@/config'
import { logger } from '@/shared/utils/logger'
import { errorHandler } from '@/shared/middleware/errorHandler'

import { authRouter } from '@/modules/auth/auth.routes'
import { usersRouter } from '@/modules/users/users.routes'
import { eventsRouter } from '@/modules/events/events.routes'
// Route imports — added as each module is built
// import { eventsRouter } from '@/modules/events/events.router'
// import { availabilityRouter } from '@/modules/availability/availability.router'
// import { connectionsRouter } from '@/modules/connections/connections.router'
// import { conversationsRouter } from '@/modules/conversations/conversations.router'
// import { messagesRouter } from '@/modules/messages/messages.router'
// import { creditsRouter } from '@/modules/credits/credits.router'
// import { bookingsRouter } from '@/modules/bookings/bookings.router'
// import { ticketsRouter } from '@/modules/tickets/tickets.router'
// import { ratingsRouter } from '@/modules/ratings/ratings.router'
// import { notificationsRouter } from '@/modules/notifications/notifications.router'
// import { adminRouter } from '@/modules/admin/admin.router'

export function createApp() {
  const app = express()

  // ── Security headers
  app.use(helmet())

  // ── CORS
  app.use(
    cors({
      origin: config.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )

  // ── Request logging (Pino)
  app.use(
    pinoHttp({
      logger,
      redact: ['req.headers.authorization'],
      customLogLevel(_req, res) {
        if (res.statusCode >= 500) return 'error'
        if (res.statusCode >= 400) return 'warn'
        return 'info'
      },
    })
  )

  // ── Body parsers
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))

  // ── Global rate limit (100 req/min per IP — tighter limits on specific routes)
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
    })
  )

  // ── Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'eventmeet-server', timestamp: new Date().toISOString() })
  })

  // ── API v1 routes
  const v1 = express.Router()

  v1.use('/auth', authRouter)
  v1.use('/users', usersRouter)
  v1.use('/events', eventsRouter)
  // Uncomment as modules are built:
  // v1.use('/admin', adminRouter)

  app.use('/v1', v1)

  // ── 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    })
  })

  // ── Global error handler (must be last)
  app.use(errorHandler)

  return app
}
