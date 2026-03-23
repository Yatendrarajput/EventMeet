import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, BellOff, Trash2, CheckCheck, Loader2,
  UserPlus, UserCheck, Ticket, CalendarX, Star,
  CreditCard, Zap, Users,
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import { getSocket } from '@/lib/socket'
import type { NotificationType } from '@/types/notification'

/* ── Types ── */

interface NotificationItem {
  id:        string
  type:      NotificationType
  title:     string
  body:      string
  isRead:    boolean
  createdAt: string
  data:      Record<string, unknown>
  event:     { id: string; title: string } | null
}

/* ── Helpers ── */

function notifIcon(type: NotificationType) {
  switch (type) {
    case 'CONNECTION_REQUEST':
    case 'QUICK_CONNECT_REQUEST': return UserPlus
    case 'CONNECTION_ACCEPTED':   return UserCheck
    case 'BOOKING_CONFIRMED':
    case 'BOOKING_INVITE':        return Ticket
    case 'BOOKING_CANCELLED':
    case 'EVENT_CANCELLED':       return CalendarX
    case 'RATING_REMINDER':       return Star
    case 'CREDITS_RECHARGED':
    case 'PAYMENT_FAILED':        return CreditCard
    case 'GROUP_INVITE':          return Users
    case 'SEAT_ASSIGNED':
    case 'QUEUE_UPDATED':         return Zap
    default:                      return Bell
  }
}

function notifColor(type: NotificationType) {
  switch (type) {
    case 'CONNECTION_REQUEST':
    case 'QUICK_CONNECT_REQUEST':
    case 'CONNECTION_ACCEPTED':  return 'text-violet bg-violet/15'
    case 'BOOKING_CONFIRMED':
    case 'SEAT_ASSIGNED':        return 'text-green-400 bg-green-400/15'
    case 'BOOKING_CANCELLED':
    case 'EVENT_CANCELLED':
    case 'PAYMENT_FAILED':       return 'text-red-400 bg-red-400/15'
    case 'RATING_REMINDER':      return 'text-amber-400 bg-amber-400/15'
    case 'CREDITS_RECHARGED':    return 'text-sky-400 bg-sky-400/15'
    default:                     return 'text-text-secondary bg-elevated'
  }
}

/* ── Page ── */

function notifRoute(type: NotificationType): string {
  switch (type) {
    case 'CONNECTION_REQUEST':
    case 'QUICK_CONNECT_REQUEST': return '/connections?tab=requests'
    case 'CONNECTION_ACCEPTED':   return '/connections'
    case 'BOOKING_CONFIRMED':
    case 'BOOKING_CANCELLED':
    case 'BOOKING_INVITE':
    case 'PAYMENT_FAILED':
    case 'SEAT_ASSIGNED':
    case 'QUEUE_UPDATED':         return '/bookings'
    case 'EVENT_CANCELLED':       return '/events'
    default:                      return ''
  }
}

export default function Notifications() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Fetch notifications (all, paginated to 50 for now)
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications', { params: { page: 1, limit: 50 } })
      // sendPaginated shape: res.data.data = array, res.data.pagination = { ..., extra: { unreadCount } }
      return {
        notifications: res.data.data as NotificationItem[],
        unreadCount:   (res.data.pagination?.extra?.unreadCount as number) ?? 0,
        total:         (res.data.pagination?.total as number) ?? 0,
      }
    },
  })

  const notifications = data?.notifications ?? []
  const unreadCount   = data?.unreadCount   ?? 0

  // Mark one as read
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notif-unread-count'] })
    },
  })

  // Mark all as read
  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notif-unread-count'] })
    },
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notif-unread-count'] })
    },
  })

  // Real-time: new notification arrives → refresh list + badge
  useEffect(() => {
    const s = getSocket()
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notif-unread-count'] })
    }
    s.on('notification:new', handler)
    return () => { s.off('notification:new', handler) }
  }, [queryClient])

  const handleClick = (n: NotificationItem) => {
    if (!n.isRead) markReadMutation.mutate(n.id)
    const route = notifRoute(n.type)
    if (route) navigate(route)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="btn-ghost text-violet hover:text-violet-light flex items-center gap-2 text-sm"
          >
            {markAllMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CheckCheck className="w-4 h-4" />
            }
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-violet" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <BellOff className="w-10 h-10 text-text-disabled" />
          <p className="text-text-primary font-medium">No notifications yet</p>
          <p className="text-text-secondary text-sm">You're all clear — check back later.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence initial={false}>
            {notifications.map(n => {
              const Icon = notifIcon(n.type)
              const color = notifColor(n.type)
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                  className={cn(
                    'group relative flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer',
                    n.isRead
                      ? 'bg-surface border-border hover:bg-elevated'
                      : 'bg-elevated border-violet/30 hover:border-violet/50'
                  )}
                  onClick={() => handleClick(n)}
                >
                  {/* Icon */}
                  <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0', color)}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium leading-snug', n.isRead ? 'text-text-secondary' : 'text-text-primary')}>
                      {n.title}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{n.body}</p>
                    {n.event && (
                      <p className="text-xs text-violet mt-1 truncate">{n.event.title}</p>
                    )}
                  </div>

                  {/* Right side: date + unread dot + delete */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xs text-text-disabled whitespace-nowrap">
                      {formatDate(n.createdAt)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-violet" />
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); deleteMutation.mutate(n.id) }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-error/15 text-text-disabled hover:text-error"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
