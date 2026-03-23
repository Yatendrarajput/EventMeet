import { io, Socket } from 'socket.io-client'

// Singleton — one socket connection for the whole app lifetime
let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      path: '/socket.io',
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export function connectSocket(userId: string) {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
    s.once('connect', () => {
      s.emit('join:user', userId)
    })
  }
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect()
  }
  socket = null
}
