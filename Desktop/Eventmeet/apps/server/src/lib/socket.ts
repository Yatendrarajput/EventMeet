import { Server as HttpServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import { config } from '@/config'
import { logger } from '@/shared/utils/logger'

let io: SocketServer

export function initSocket(httpServer: HttpServer): SocketServer {
  const allowedOrigins = config.CLIENT_URL.split(',').map(o => o.trim())
  io = new SocketServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  // Redis adapter requires two separate ioredis connections (pub + sub)
  const pubClient = new Redis(config.REDIS_URL)
  const subClient = pubClient.duplicate()
  io.adapter(createAdapter(pubClient, subClient))

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Socket connected')

    // Join user's personal room for notifications
    socket.on('join:user', (userId: string) => {
      socket.join(`user:${userId}`)
    })

    // Join conversation room for chat
    socket.on('join:conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`)
    })

    // Leave conversation room
    socket.on('leave:conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`)
    })

    // Typing indicators
    socket.on(
      'typing:start',
      ({ conversationId, userId }: { conversationId: string; userId: string }) => {
        socket.to(`conversation:${conversationId}`).emit('typing:start', { userId })
      }
    )

    socket.on(
      'typing:stop',
      ({ conversationId, userId }: { conversationId: string; userId: string }) => {
        socket.to(`conversation:${conversationId}`).emit('typing:stop', { userId })
      }
    )

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Socket disconnected')
    })
  })

  logger.info('Socket.io initialized with Redis adapter')
  return io
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.io not initialized — call initSocket first')
  return io
}

// ─────────────────────────────────────────────────────────────────
// Emit helpers — used by services to push real-time events
// ─────────────────────────────────────────────────────────────────
export const SocketEvents = {
  NOTIFICATION_NEW: 'notification:new',
  MESSAGE_NEW: 'message:new',
  MESSAGE_DELETED: 'message:deleted',
  BOOKING_INVITE: 'booking:invite',
  BOOKING_QUEUE_UPDATED: 'booking:queue:updated',
  BOOKING_CONFIRMED: 'booking:confirmed',
  BOOKING_CANCELLED: 'booking:cancelled',
  CONNECTION_REQUEST: 'connection:request',
  CONNECTION_ACCEPTED: 'connection:accepted',
} as const
