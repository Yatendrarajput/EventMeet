import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Ticket, Calendar, MapPin, Users, Banknote,
  Clock, CheckCircle, XCircle, Loader2,
  QrCode, X, AlertCircle, ExternalLink
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn, formatDate, formatTime, formatCurrency } from '@/lib/utils'

/* ── Types ── */

interface BookingEvent {
  id: string; title: string; startDatetime: string; bannerUrl: string | null
}
interface BookingSection { id: string; name: string }

interface Booking {
  id: string
  status: 'INITIATED' | 'PAYMENT_PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED'
  totalParticipants: number
  finalAmount: string
  perPersonAmount: string
  softReservationExpiresAt: string | null
  paymentDeadline: string | null
  createdAt: string
  event: BookingEvent
  section: BookingSection
}

interface TicketData {
  id: string
  qrCode: string
  status: string
  event: BookingEvent
  section: BookingSection
  booking: { id: string; status: string; totalParticipants: number }
}

/* ── Helpers ── */

const STATUS_CONFIG = {
  PAYMENT_PENDING: { label: 'Payment Pending', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  CONFIRMED:       { label: 'Confirmed',        color: 'text-success',    bg: 'bg-success/10 border-success/30' },
  CANCELLED:       { label: 'Cancelled',         color: 'text-pink',       bg: 'bg-pink/10 border-pink/30' },
  REFUNDED:        { label: 'Refunded',          color: 'text-violet-light', bg: 'bg-violet/10 border-violet/30' },
  INITIATED:       { label: 'Initiated',         color: 'text-text-secondary', bg: 'bg-elevated border-border' },
  QUEUE_PENDING:   { label: 'In Queue',          color: 'text-text-secondary', bg: 'bg-elevated border-border' },
  SEATS_PENDING:   { label: 'Awaiting Seats',   color: 'text-text-secondary', bg: 'bg-elevated border-border' },
} as const

function useCountdown(deadline: string | null) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    if (!deadline) return
    const tick = () => {
      const diff = new Date(deadline).getTime() - Date.now()
      if (diff <= 0) { setRemaining('Expired'); return }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(`${m}:${s.toString().padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline])

  return remaining
}

/* ── Page ── */

export default function Bookings() {
  const navigate = useNavigate()
  const [ticketBookingId, setTicketBookingId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings')
      return {
        bookings: res.data.data as Booking[],
        total: res.data.pagination.total as number,
      }
    },
    staleTime: 0,
  })

  const bookings = data?.bookings ?? []

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Bookings</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {data?.total ?? 0} booking{(data?.total ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/events')}
          className="btn btn-secondary text-sm flex items-center gap-1.5"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Find Events
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card flex gap-4 animate-pulse">
              <div className="w-20 h-20 rounded-lg bg-elevated flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3.5 w-48 bg-elevated rounded" />
                <div className="h-3 w-32 bg-elevated rounded" />
                <div className="h-3 w-24 bg-elevated rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="card text-center py-10 space-y-2">
          <AlertCircle className="w-8 h-8 text-pink mx-auto" />
          <p className="text-pink font-medium">Failed to load bookings</p>
          <p className="text-text-secondary text-sm">Check your connection and try again.</p>
        </div>
      )}

      {!isLoading && !isError && bookings.length === 0 && (
        <div className="card text-center py-14 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-violet/10 flex items-center justify-center mx-auto">
            <Ticket className="w-8 h-8 text-violet" />
          </div>
          <div className="space-y-1">
            <p className="text-text-primary font-medium">No bookings yet</p>
            <p className="text-text-secondary text-sm">Find an event, pick a section, and book your spot.</p>
          </div>
          <button onClick={() => navigate('/events')} className="btn btn-primary text-sm">Browse Events</button>
        </div>
      )}

      <div className="space-y-3">
        {bookings.map(booking => (
          <BookingCard
            key={booking.id}
            booking={booking}
            onViewTicket={() => setTicketBookingId(booking.id)}
          />
        ))}
      </div>

      {/* Ticket modal */}
      <AnimatePresence>
        {ticketBookingId && (
          <TicketModal bookingId={ticketBookingId} onClose={() => setTicketBookingId(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Booking Card ── */

function BookingCard({ booking, onViewTicket }: { booking: Booking; onViewTicket: () => void }) {
  const queryClient = useQueryClient()
  const countdown   = useCountdown(booking.status === 'PAYMENT_PENDING' ? booking.paymentDeadline : null)
  const isExpired   = countdown === 'Expired'

  const cfg = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.INITIATED

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/bookings/${booking.id}/cancel`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  })

  const isCancelled = booking.status === 'CANCELLED' || booking.status === 'REFUNDED'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('card space-y-3', isCancelled && 'opacity-60')}
    >
      <div className="flex items-start gap-3">
        {/* Event thumbnail */}
        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-elevated">
          {booking.event.bannerUrl
            ? <img src={booking.event.bannerUrl} alt={booking.event.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-brand opacity-30 flex items-center justify-center">
                <Ticket className="w-6 h-6 text-white/60" />
              </div>
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-text-primary font-semibold text-sm leading-snug truncate">{booking.event.title}</p>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0', cfg.bg, cfg.color)}>
              {cfg.label}
            </span>
          </div>

          <p className="text-text-disabled text-xs flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(booking.event.startDatetime)} · {formatTime(booking.event.startDatetime)}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-text-disabled">
            <span className="flex items-center gap-1">
              <Ticket className="w-3 h-3" /> {booking.section.name}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" /> {booking.totalParticipants} seat{booking.totalParticipants > 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Banknote className="w-3 h-3" /> {formatCurrency(Number(booking.finalAmount))}
            </span>
          </div>
        </div>
      </div>

      {/* Payment pending: countdown + action */}
      {booking.status === 'PAYMENT_PENDING' && (
        <div className={cn(
          'flex items-center justify-between rounded-lg px-3 py-2',
          isExpired ? 'bg-pink/10 border border-pink/20' : 'bg-yellow-400/5 border border-yellow-400/20'
        )}>
          <div className="flex items-center gap-2">
            <Clock className={cn('w-4 h-4', isExpired ? 'text-pink' : 'text-yellow-400')} />
            <span className={cn('text-xs font-medium', isExpired ? 'text-pink' : 'text-yellow-400')}>
              {isExpired ? 'Reservation expired' : `Pay within ${countdown}`}
            </span>
          </div>
          {!isExpired && (
            <button
              onClick={() => {/* payment via confirm endpoint */}}
              className="text-xs bg-yellow-400 text-black font-semibold px-3 py-1 rounded-full hover:bg-yellow-300 transition-colors"
            >
              Pay Now
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      {!isCancelled && (
        <div className="flex gap-2 pt-1 border-t border-border">
          {booking.status === 'CONFIRMED' && (
            <button
              onClick={onViewTicket}
              className="btn btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" /> View Ticket
            </button>
          )}
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="btn btn-ghost border border-border flex-1 text-xs py-2 flex items-center justify-center gap-1.5 text-pink hover:bg-pink/10"
          >
            {cancelMutation.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <><XCircle className="w-3.5 h-3.5" /> Cancel</>
            }
          </button>
        </div>
      )}
    </motion.div>
  )
}

/* ── Ticket Modal ── */

function TicketModal({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ['ticket', bookingId],
    queryFn: async () => {
      const res = await api.get(`/bookings/${bookingId}/ticket`)
      return res.data.data as TicketData
    },
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-base/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-sm bg-surface border border-border rounded-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-elevated">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-violet" />
            <span className="font-semibold text-text-primary text-sm">Your Ticket</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-base/50 transition-colors">
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-violet animate-spin" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-12 space-y-2 px-6 text-center">
            <AlertCircle className="w-8 h-8 text-pink" />
            <p className="text-pink font-medium text-sm">Ticket not available</p>
            <p className="text-text-secondary text-xs">Ticket is only available for confirmed bookings.</p>
          </div>
        )}

        {ticket && (
          <div className="p-5 space-y-5">
            {/* Event info */}
            <div className="space-y-1.5">
              <p className="font-bold text-text-primary">{ticket.event.title}</p>
              <p className="text-text-secondary text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(ticket.event.startDatetime)} · {formatTime(ticket.event.startDatetime)}
              </p>
              <p className="text-text-secondary text-xs flex items-center gap-1">
                <Ticket className="w-3 h-3" /> Section: {ticket.section.name}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <CheckCircle className="w-3.5 h-3.5 text-success" />
                <span className="text-success text-xs font-medium">Confirmed · {ticket.booking.totalParticipants} seat{ticket.booking.totalParticipants > 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center space-y-3 bg-white rounded-2xl p-5">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(ticket.qrCode)}&bgcolor=ffffff&color=000000`}
                alt="Ticket QR Code"
                className="w-44 h-44"
              />
              <p className="text-black/40 text-[10px] font-mono text-center break-all leading-relaxed">
                {ticket.qrCode}
              </p>
            </div>

            <p className="text-text-disabled text-xs text-center">
              Show this QR code at the event entrance
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
