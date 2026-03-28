import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ArrowLeft, Calendar, MapPin, Banknote, Users,
  CheckCircle, Loader2, AlertCircle, CreditCard
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn, formatDate, formatTime, formatCurrency } from '@/lib/utils'
import type { Event } from '@/types/event'

export default function BookingNew() {
  const [params] = useSearchParams()
  const navigate  = useNavigate()
  const eventId   = params.get('eventId')  ?? ''
  const sectionId = params.get('sectionId') ?? ''
  const [step, setStep] = useState<'review' | 'paying' | 'done'>('review')
  const [bookingId, setBookingId] = useState<string | null>(null)

  const { data: event, isLoading, isError } = useQuery<Event>({
    queryKey: ['event', eventId],
    queryFn:  async () => { const r = await api.get(`/events/${eventId}`); return r.data.data },
    enabled:  !!eventId,
  })

  const section = event?.sections.find(s => s.id === sectionId)

  // Step 1 — create booking (PAYMENT_PENDING + seat soft-reservation)
  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await api.post('/bookings', { eventId, sectionId })
      return r.data.data as { id: string }
    },
    onSuccess: (data) => {
      setBookingId(data.id)
      setStep('paying')
    },
  })

  // Step 2 — confirm (simulate payment → CONFIRMED + tickets generated)
  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/bookings/${id}/confirm`)
    },
    onSuccess: () => {
      setStep('done')
    },
  })

  if (!eventId || !sectionId) return (
    <div className="max-w-lg mx-auto pt-20 text-center space-y-4">
      <AlertCircle className="w-10 h-10 text-pink mx-auto" />
      <p className="text-text-secondary">Invalid booking link — missing event or section.</p>
      <button onClick={() => navigate('/events')} className="btn btn-secondary text-sm">Browse Events</button>
    </div>
  )

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 text-violet animate-spin" />
    </div>
  )

  if (isError || !event || !section) return (
    <div className="max-w-lg mx-auto pt-20 text-center space-y-4">
      <AlertCircle className="w-10 h-10 text-pink mx-auto" />
      <p className="text-text-secondary">Could not load event details.</p>
      <button onClick={() => navigate(-1)} className="btn btn-secondary text-sm">Go Back</button>
    </div>
  )

  /* ── Done screen ── */
  if (step === 'done') return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="card text-center py-12 space-y-5">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-success" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text-primary">Booking Confirmed!</h1>
          <p className="text-text-secondary text-sm">Your ticket has been generated. See you at the event!</p>
        </div>
        <div className="bg-elevated rounded-xl p-4 text-left space-y-2">
          <p className="text-text-primary font-medium text-sm">{event.title}</p>
          <p className="text-text-disabled text-xs flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {formatDate(event.startDatetime)} · {formatTime(event.startDatetime)}
          </p>
          <p className="text-text-disabled text-xs flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {event.venue.name}, {event.venue.city}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/bookings')} className="btn btn-primary flex-1 text-sm">View My Tickets</button>
          <button onClick={() => navigate('/events')} className="btn btn-ghost border border-border flex-1 text-sm">Browse Events</button>
        </div>
      </div>
    </div>
  )

  const price = Number(section.pricePerSeat)

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Progress steps */}
      <div className="flex items-center gap-2">
        {(['review', 'paying', 'done'] as const).map((s, i) => {
          const isDone = (step as string) === 'done'
          return (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
              step === s ? 'bg-violet text-white' :
              (step === 'paying' && s === 'review') || isDone ? 'bg-success/20 text-success' :
              'bg-elevated text-text-disabled'
            )}>
              {(step === 'paying' && s === 'review') || isDone && s !== 'done'
                ? <CheckCircle className="w-4 h-4" />
                : i + 1
              }
            </div>
            <span className={cn(
              'text-xs capitalize',
              step === s ? 'text-text-primary font-medium' : 'text-text-disabled'
            )}>{s === 'paying' ? 'Payment' : s === 'done' ? 'Confirmed' : 'Review'}</span>
            {i < 2 && <div className="flex-1 h-px bg-border" />}
          </div>
        )})}

      </div>

      {/* Event summary card */}
      <div className="card overflow-hidden">
        {event.bannerUrl
          ? <img src={event.bannerUrl} alt={event.title} className="w-full h-32 object-cover" />
          : <div className="h-20 bg-gradient-brand opacity-30" />
        }
        <div className="p-4 space-y-3">
          <h2 className="font-bold text-text-primary">{event.title}</h2>
          <div className="space-y-1.5 text-sm">
            <p className="flex items-center gap-2 text-text-secondary">
              <Calendar className="w-4 h-4 text-violet flex-shrink-0" />
              {formatDate(event.startDatetime)} · {formatTime(event.startDatetime)}
            </p>
            <p className="flex items-center gap-2 text-text-secondary">
              <MapPin className="w-4 h-4 text-pink flex-shrink-0" />
              {event.venue.name}, {event.venue.city}
            </p>
          </div>
        </div>
      </div>

      {/* Booking detail */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-text-primary text-sm">Booking Summary</h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Section
            </span>
            <span className="text-text-primary font-medium">{section.name}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Price per seat</span>
            <span className="text-text-primary">{formatCurrency(price)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Seats available</span>
            <span className={cn('font-medium', section.availableSeats < 5 ? 'text-pink' : 'text-text-primary')}>
              {section.availableSeats} left
            </span>
          </div>
        </div>

        <div className="border-t border-border pt-3 flex items-center justify-between">
          <span className="text-text-secondary text-sm">Total</span>
          <div className="flex items-center gap-1 text-violet-light font-bold text-lg">
            <Banknote className="w-4 h-4" /> {formatCurrency(price)}
          </div>
        </div>

        {/* Seat reservation warning */}
        <div className="flex items-start gap-2 bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary">
            Seats are soft-reserved for <strong className="text-text-primary">15 minutes</strong> after you proceed. Complete payment before the timer expires.
          </p>
        </div>
      </div>

      {/* Step actions */}
      {step === 'review' && (
        <div className="space-y-3">
          {createMutation.isError && (
            <p className="text-pink text-sm text-center">
              {(createMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create booking. Try again.'}
            </p>
          )}
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="btn btn-primary w-full text-sm py-3 flex items-center justify-center gap-2"
          >
            {createMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <>Proceed to Payment</>
            }
          </button>
        </div>
      )}

      {step === 'paying' && bookingId && (
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-violet" />
            </div>
            <div>
              <p className="text-text-primary font-medium text-sm">Simulated Payment</p>
              <p className="text-text-disabled text-xs">Razorpay integration pending — click below to simulate</p>
            </div>
          </div>

          <div className="bg-elevated rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-text-disabled">Amount</span>
              <span className="text-text-primary font-medium">{formatCurrency(price)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-disabled">Booking ID</span>
              <span className="text-text-disabled font-mono">{bookingId.slice(0, 8)}…</span>
            </div>
          </div>

          {confirmMutation.isError && (
            <p className="text-pink text-xs text-center">
              {(confirmMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Payment failed. Try again.'}
            </p>
          )}

          <button
            onClick={() => confirmMutation.mutate(bookingId)}
            disabled={confirmMutation.isPending}
            className="btn btn-primary w-full text-sm py-3 flex items-center justify-center gap-2"
          >
            {confirmMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><CheckCircle className="w-4 h-4" /> Confirm Payment</>
            }
          </button>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-ghost border border-border w-full text-sm"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
