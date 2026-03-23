import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { EventCard } from '@/components/ui/EventCard'
import { cn } from '@/lib/utils'
import type { Event, EventCategory, EventsResponse } from '@/types/event'

const CATEGORIES: { value: EventCategory | ''; label: string; emoji: string }[] = [
  { value: '',        label: 'All',     emoji: '🌟' },
  { value: 'MUSIC',   label: 'Music',   emoji: '🎵' },
  { value: 'COMEDY',  label: 'Comedy',  emoji: '😂' },
  { value: 'SPORTS',  label: 'Sports',  emoji: '⚽' },
  { value: 'TECH',    label: 'Tech',    emoji: '💻' },
  { value: 'THEATER', label: 'Theater', emoji: '🎭' },
  { value: 'ART',     label: 'Art',     emoji: '🎨' },
  { value: 'FOOD',    label: 'Food',    emoji: '🍜' },
]

export default function Events() {
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState<EventCategory | ''>('')
  const [city,     setCity]     = useState('')
  const [page,     setPage]     = useState(1)

  const { data, isLoading, isError } = useQuery<EventsResponse>({
    queryKey: ['events', category, city, page],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: '12' }
      if (category) params.category = category
      if (city)     params.city     = city
      const res = await api.get('/events', { params })
      return { data: res.data.data, pagination: res.data.pagination }
    },
    staleTime: 1000 * 60 * 2,
  })

  const filtered = (data?.data ?? []).filter((e: Event) =>
    search ? e.title.toLowerCase().includes(search.toLowerCase()) : true
  )

  const clearFilters = () => {
    setSearch(''); setCategory(''); setCity(''); setPage(1)
  }
  const hasFilters = search || category || city

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Discover Events</h1>
        <p className="text-text-secondary text-sm mt-1">Find events and meet people going to the same ones.</p>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-disabled" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events…"
            className="input pl-9"
          />
        </div>

        {/* City filter */}
        <div className="relative sm:w-44">
          <input
            value={city}
            onChange={e => { setCity(e.target.value); setPage(1) }}
            placeholder="City…"
            className="input"
          />
        </div>

        {/* Clear */}
        {hasFilters && (
          <button onClick={clearFilters} className="btn-ghost gap-1.5 flex-shrink-0">
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map(({ value, label, emoji }) => (
          <button
            key={value}
            onClick={() => { setCategory(value); setPage(1) }}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium flex-shrink-0 transition-all duration-200 border',
              category === value
                ? 'bg-violet text-white border-violet shadow-violet'
                : 'bg-surface border-border text-text-secondary hover:border-violet/50 hover:text-text-primary'
            )}
          >
            <span>{emoji}</span> {label}
          </button>
        ))}
      </div>

      {/* Results count */}
      {!isLoading && data && (
        <p className="text-text-disabled text-xs">
          {hasFilters ? `${filtered.length} results` : `${data.pagination.total} events`}
        </p>
      )}

      {/* Event grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-violet animate-spin" />
        </div>
      ) : isError ? (
        <div className="text-center py-24">
          <p className="text-text-secondary">Failed to load events.</p>
          <button className="btn-secondary mt-4 btn-sm" onClick={() => setPage(1)}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 space-y-3">
          <p className="text-4xl">🎭</p>
          <p className="text-text-secondary">No events found.</p>
          {hasFilters && <button onClick={clearFilters} className="btn-secondary btn-sm">Clear filters</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((event: Event, i: number) => (
            <EventCard key={event.id} event={event} index={i} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.pagination.total > 12 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary btn-sm"
          >
            Previous
          </button>
          <span className="text-sm text-text-secondary">
            Page {page} of {Math.ceil(data.pagination.total / 12)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!data.pagination.hasMore}
            className="btn-secondary btn-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
