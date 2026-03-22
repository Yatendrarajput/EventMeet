import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Clock, Users, IndianRupee } from 'lucide-react'
import { cn, formatDate, formatTime, formatCurrency } from '@/lib/utils'
import type { Event, EventCategory } from '@/types/event'

const categoryColors: Record<EventCategory, string> = {
  MUSIC:   'badge-violet',
  COMEDY:  'badge-pink',
  SPORTS:  'badge-success',
  TECH:    'badge-warning',
  THEATER: 'badge-violet',
  ART:     'badge-pink',
  FOOD:    'badge-success',
  OTHER:   'bg-elevated text-text-secondary',
}

const categoryEmoji: Record<EventCategory, string> = {
  MUSIC:   '🎵', COMEDY: '😂', SPORTS: '⚽', TECH: '💻',
  THEATER: '🎭', ART:    '🎨', FOOD:   '🍜', OTHER: '✨',
}

interface Props {
  event: Event
  index?: number
}

export function EventCard({ event, index = 0 }: Props) {
  const minPrice = Math.min(...event.sections.map(s => Number(s.pricePerSeat)))
  const totalSeats = event.sections.reduce((a, s) => a + s.availableSeats, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/events/${event.id}`} className="group block card p-0 overflow-hidden hover:border-violet/50 hover:shadow-glow transition-all duration-300">
        {/* Banner */}
        <div className="relative h-44 bg-elevated overflow-hidden">
          {event.bannerUrl
            ? <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            : (
              <div className="w-full h-full bg-gradient-brand opacity-30 flex items-center justify-center">
                <span className="text-5xl">{categoryEmoji[event.category]}</span>
              </div>
            )
          }
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-card" />

          {/* Category badge */}
          <div className="absolute top-3 left-3">
            <span className={cn('badge text-xs', categoryColors[event.category])}>
              {categoryEmoji[event.category]} {event.category}
            </span>
          </div>

          {/* Availability dot */}
          {event._count.availability > 0 && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-base/70 backdrop-blur-sm rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-text-primary font-medium">{event._count.availability} going</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-text-primary leading-snug group-hover:text-violet-light transition-colors line-clamp-2">
            {event.title}
          </h3>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-text-secondary text-xs">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{formatDate(event.startDatetime)} · {formatTime(event.startDatetime)}</span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary text-xs">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{event.venue.name}, {event.venue.city}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border">
            <div className="flex items-center gap-1 text-violet-light font-semibold text-sm">
              <IndianRupee className="w-3.5 h-3.5" />
              {event.sections.length > 0
                ? <span>{formatCurrency(minPrice).replace('₹', '')}+</span>
                : <span>Free</span>
              }
            </div>
            <div className="flex items-center gap-1 text-text-disabled text-xs">
              <Users className="w-3.5 h-3.5" />
              <span>{totalSeats} seats left</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
