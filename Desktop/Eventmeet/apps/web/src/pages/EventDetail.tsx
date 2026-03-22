import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  MapPin, Clock, Users, Banknote, ArrowLeft, Calendar,
  CheckCircle, Loader2, Globe, Tag, Eye
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn, formatDate, formatTime, formatCurrency } from '@/lib/utils'
import type { Event, EventSection, AvailableUser } from '@/types/event'

const categoryEmoji: Record<string, string> = {
  MUSIC: '🎵', COMEDY: '😂', SPORTS: '⚽', TECH: '💻',
  THEATER: '🎭', ART: '🎨', FOOD: '🍜', OTHER: '✨',
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [availNote, setAvailNote] = useState('')
  const [isAvailable, setIsAvailable] = useState(false)

  const { data: event, isLoading, isError } = useQuery<Event>({
    queryKey: ['event', id],
    queryFn: async () => {
      const res = await api.get(`/events/${id}`)
      return res.data.data
    },
    enabled: !!id,
  })

  const { data: availableUsers = [] } = useQuery<AvailableUser[]>({
    queryKey: ['event-available-users', id],
    queryFn: async () => {
      const res = await api.get(`/events/${id}/available-users`)
      return res.data.data
    },
    enabled: !!id,
  })

  const availMutation = useMutation({
    mutationFn: async () => {
      if (isAvailable) {
        await api.delete(`/events/${id}/availability`)
      } else {
        await api.post(`/events/${id}/availability`, { note: availNote || undefined })
      }
    },
    onSuccess: () => {
      setIsAvailable(prev => !prev)
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      queryClient.invalidateQueries({ queryKey: ['event-available-users', id] })
    },
  })

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 text-violet animate-spin" />
    </div>
  )

  if (isError || !event) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <p className="text-text-secondary">Event not found.</p>
      <button onClick={() => navigate('/events')} className="btn-secondary">Back to Events</button>
    </div>
  )

  const minPrice = event.sections.length > 0
    ? Math.min(...event.sections.map(s => Number(s.pricePerSeat)))
    : 0

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Hero Banner */}
      <div className="relative h-64 sm:h-80 rounded-xl overflow-hidden bg-elevated">
        {event.bannerUrl
          ? <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
          : (
            <div className="w-full h-full bg-gradient-brand opacity-40 flex items-center justify-center">
              <span className="text-8xl">{categoryEmoji[event.category]}</span>
            </div>
          )
        }
        <div className="absolute inset-0 bg-gradient-card" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div className="space-y-1">
            <span className="badge badge-violet text-xs">
              {categoryEmoji[event.category]} {event.category}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight drop-shadow-lg">
              {event.title}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5 bg-base/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs text-text-primary">
              <Eye className="w-3.5 h-3.5" /> {event.viewCount} views
            </div>
            {event._count.availability > 0 && (
              <div className="flex items-center gap-1.5 bg-base/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs text-text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                {event._count.availability} going
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — main info */}
        <div className="lg:col-span-2 space-y-6">

          {/* Date + Venue */}
          <div className="card space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-violet" />
              </div>
              <div>
                <p className="text-text-primary font-medium">{formatDate(event.startDatetime)}</p>
                <p className="text-text-secondary text-sm">
                  {formatTime(event.startDatetime)} — {formatTime(event.endDatetime)}
                  {event.doorsOpenAt && ` · Doors open ${formatTime(event.doorsOpenAt)}`}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-pink/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-pink" />
              </div>
              <div>
                <p className="text-text-primary font-medium">{event.venue.name}</p>
                <p className="text-text-secondary text-sm">
                  {event.venue.addressLine1}, {event.venue.city}, {event.venue.state}
                  {event.venue.pincode && ` — ${event.venue.pincode}`}
                </p>
                {event.venue.googleMapsUrl && (
                  <a
                    href={event.venue.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-violet-light text-xs flex items-center gap-1 mt-1 hover:underline"
                  >
                    <Globe className="w-3 h-3" /> View on Maps
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="card space-y-2">
              <h2 className="font-semibold text-text-primary">About this event</h2>
              <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">{event.description}</p>
            </div>
          )}

          {/* Tags */}
          {event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-elevated border border-border text-text-secondary">
                  <Tag className="w-3 h-3" /> {tag}
                </span>
              ))}
            </div>
          )}

          {/* Sections */}
          <div className="space-y-3">
            <h2 className="font-semibold text-text-primary">Select a Section</h2>
            {event.sections.length === 0
              ? <p className="text-text-disabled text-sm">No sections available.</p>
              : event.sections.map(section => (
                <SectionCard
                  key={section.id}
                  section={section}
                  selected={selectedSection === section.id}
                  onSelect={() => setSelectedSection(selectedSection === section.id ? null : section.id)}
                />
              ))
            }
          </div>
        </div>

        {/* Right — sidebar */}
        <div className="space-y-4">
          {/* Price + Book */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">Starting from</span>
              <div className="flex items-center gap-1 text-violet-light font-bold text-xl">
                <Banknote className="w-5 h-5" />
                {event.sections.length > 0 ? formatCurrency(minPrice) : 'Free'}
              </div>
            </div>
            {selectedSection && (
              <div className="text-xs text-text-secondary border-t border-border pt-2">
                Selected: <span className="text-text-primary font-medium">
                  {event.sections.find(s => s.id === selectedSection)?.name}
                </span>
              </div>
            )}
            <button
              disabled={!selectedSection}
              onClick={() => navigate(`/bookings/new?eventId=${event.id}&sectionId=${selectedSection}`)}
              className={cn(
                'w-full btn text-sm py-3',
                selectedSection
                  ? 'btn-primary'
                  : 'opacity-40 cursor-not-allowed bg-surface border border-border text-text-disabled'
              )}
            >
              {selectedSection ? 'Book Now' : 'Select a section first'}
            </button>
          </div>

          {/* I'm Going */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-primary font-medium text-sm">Mark yourself going</p>
                <p className="text-text-disabled text-xs">Let others know you will be there</p>
              </div>
              {isAvailable && <CheckCircle className="w-5 h-5 text-success" />}
            </div>
            {!isAvailable && (
              <input
                value={availNote}
                onChange={e => setAvailNote(e.target.value)}
                placeholder="Add a note (optional)..."
                className="input text-sm"
                maxLength={200}
              />
            )}
            <button
              onClick={() => availMutation.mutate()}
              disabled={availMutation.isPending}
              className={cn('w-full btn text-sm', isAvailable ? 'btn-ghost border border-border' : 'btn-secondary')}
            >
              {availMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                : isAvailable ? 'Remove availability' : "I'm Going!"
              }
            </button>
          </div>

          {/* People going */}
          {availableUsers.length > 0 && (
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-text-primary text-sm">People going</h3>
                <span className="text-text-disabled text-xs">{event._count.availability} total</span>
              </div>
              <div className="space-y-2">
                {availableUsers.slice(0, 5).map(user => (
                  <div key={user.id} className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center flex-shrink-0 text-white text-xs font-bold overflow-hidden">
                      {user.avatarUrl
                        ? <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                        : user.fullName.charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-text-primary text-xs font-medium truncate">{user.fullName}</p>
                      {user.note && <p className="text-text-disabled text-xs truncate">{user.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
              {event._count.availability > 5 && (
                <p className="text-text-disabled text-xs text-center">+{event._count.availability - 5} more going</p>
              )}
            </div>
          )}

          {/* Organizer */}
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
              {event.creator.avatarUrl
                ? <img src={event.creator.avatarUrl} alt={event.creator.fullName} className="w-full h-full object-cover" />
                : event.creator.fullName.charAt(0).toUpperCase()
              }
            </div>
            <div>
              <p className="text-text-disabled text-xs">Organized by</p>
              <p className="text-text-primary text-sm font-medium">{event.creator.fullName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionCard({ section, selected, onSelect }: {
  section: EventSection
  selected: boolean
  onSelect: () => void
}) {
  const isSoldOut = section.availableSeats === 0
  const pct = section.totalSeats > 0
    ? Math.round(((section.totalSeats - section.availableSeats) / section.totalSeats) * 100)
    : 0

  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={() => !isSoldOut && onSelect()}
      disabled={isSoldOut}
      className={cn(
        'w-full text-left card transition-all duration-200',
        selected   ? 'border-violet shadow-violet bg-violet/5' : '',
        isSoldOut  ? 'opacity-50 cursor-not-allowed' : 'hover:border-violet/40 cursor-pointer',
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {selected && <CheckCircle className="w-4 h-4 text-violet flex-shrink-0" />}
          <span className="font-medium text-text-primary text-sm">{section.name}</span>
          {isSoldOut && <span className="badge badge-pink text-xs">Sold Out</span>}
        </div>
        <span className="font-bold text-violet-light">{formatCurrency(Number(section.pricePerSeat))}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {section.availableSeats} seats left</span>
        <span>{pct}% filled</span>
      </div>
      <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', pct > 80 ? 'bg-pink' : 'bg-violet')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </motion.button>
  )
}
