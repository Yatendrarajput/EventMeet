import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Users, CalendarDays, Ticket, IndianRupee, Star,
  Search, ShieldCheck, ShieldOff, Crown, Loader2,
  ChevronLeft, ChevronRight, BadgeCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'

/* ── Types ── */

interface PlatformStats {
  users:    { total: number; verified: number }
  events:   { total: number; published: number }
  bookings: { total: number; confirmed: number }
  revenue:  { total: number }
  ratings:  { total: number }
}

interface AdminUser {
  id:         string
  fullName:   string | null
  email:      string
  isVerified: boolean
  isAdmin:    boolean
  isActive:   boolean
  createdAt:  string
}

type Tab = 'overview' | 'users' | 'bookings'

/* ── Stat card ── */

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className="card flex items-start gap-4">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-text-secondary text-xs">{label}</p>
        <p className="text-2xl font-bold text-text-primary mt-0.5">{value}</p>
        {sub && <p className="text-text-disabled text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

/* ── Page ── */

export default function Admin() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = (searchParams.get('tab') as Tab) || 'overview'
  const setTab = (t: Tab) => {
    if (t === 'overview') setSearchParams({}, { replace: true })
    else setSearchParams({ tab: t }, { replace: true })
    setPage(1)
    setSearch('')
  }

  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const queryClient           = useQueryClient()

  /* Stats */
  const { data: stats } = useQuery<PlatformStats>({
    queryKey: ['admin-stats'],
    queryFn:  async () => {
      const res = await api.get('/admin/stats')
      return res.data.data as PlatformStats
    },
  })

  /* Users */
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn:  async () => {
      const res = await api.get('/admin/users', {
        params: { page, limit: 15, ...(search ? { search } : {}) },
      })
      return {
        users: res.data.data as AdminUser[],
        total: res.data.pagination.total as number,
        pages: Math.ceil(res.data.pagination.total / 15),
      }
    },
    enabled: tab === 'users',
  })

  /* Bookings */
  const { data: bookingsData, isLoading: loadingBookings } = useQuery({
    queryKey: ['admin-bookings', page],
    queryFn:  async () => {
      const res = await api.get('/admin/bookings', { params: { page, limit: 15 } })
      return {
        bookings: res.data.data as Array<{
          id: string; status: string; finalAmount: string; createdAt: string
          initiator: { fullName: string | null; email: string }
          event: { title: string }
        }>,
        total: res.data.pagination.total as number,
        pages: Math.ceil(res.data.pagination.total / 15),
      }
    },
    enabled: tab === 'bookings',
  })

  /* Mutations */
  const banMutation = useMutation({
    mutationFn: ({ userId, ban }: { userId: string; ban: boolean }) =>
      api.patch(`/admin/users/${userId}/${ban ? 'ban' : 'unban'}`),
    onSuccess: (_, { ban }) => {
      toast.success(ban ? 'User banned' : 'User unbanned')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => toast.error('Action failed'),
  })

  const adminMutation = useMutation({
    mutationFn: ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) =>
      api.patch(`/admin/users/${userId}/admin`, { makeAdmin }),
    onSuccess: (_, { makeAdmin }) => {
      toast.success(makeAdmin ? 'User promoted to admin' : 'Admin role removed')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => toast.error('Action failed'),
  })

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'users',    label: 'Users' },
    { key: 'bookings', label: 'Bookings' },
  ]


  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
        <p className="text-text-secondary text-sm mt-0.5">Platform management</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-elevated rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.key
                ? 'bg-violet text-white shadow'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <StatCard icon={Users}        label="Total Users"       value={stats?.users.total ?? '—'}
            sub={`${stats?.users.verified ?? 0} verified`}        color="text-violet bg-violet/15" />
          <StatCard icon={BadgeCheck}   label="Published Events"  value={stats?.events.published ?? '—'}
            sub={`${stats?.events.total ?? 0} total`}             color="text-sky-400 bg-sky-400/15" />
          <StatCard icon={Ticket}       label="Confirmed Bookings" value={stats?.bookings.confirmed ?? '—'}
            sub={`${stats?.bookings.total ?? 0} total`}           color="text-green-400 bg-green-400/15" />
          <StatCard icon={IndianRupee}  label="Total Revenue"     value={`₹${(stats?.revenue.total ?? 0).toLocaleString('en-IN')}`}
            sub="Confirmed bookings only"                         color="text-amber-400 bg-amber-400/15" />
          <StatCard icon={Star}         label="Ratings"           value={stats?.ratings.total ?? '—'}
            sub="Across all events"                               color="text-pink-400 bg-pink-400/15" />
          <StatCard icon={CalendarDays} label="Total Events"      value={stats?.events.total ?? '—'}
            sub={`${stats?.events.published ?? 0} live`}         color="text-orange-400 bg-orange-400/15" />
        </motion.div>
      )}

      {/* ── Users ── */}
      {tab === 'users' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Search */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-disabled" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by name or email…"
              className="input pl-9 w-full text-sm"
            />
          </div>

          {loadingUsers ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-violet" /></div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr className="text-text-disabled text-xs uppercase">
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium">Joined</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(usersData?.users ?? []).map(u => (
                    <tr key={u.id} className="hover:bg-elevated/50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-text-primary flex items-center gap-1.5">
                            {u.fullName ?? '(no name)'}
                            {u.isAdmin    && <Crown     className="w-3 h-3 text-amber-400" />}
                            {u.isVerified && <BadgeCheck className="w-3 h-3 text-sky-400" />}
                          </p>
                          <p className="text-text-disabled text-xs">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          !u.isActive
                            ? 'bg-red-400/15 text-red-400'
                            : 'bg-green-400/15 text-green-400'
                        )}>
                          {!u.isActive ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => banMutation.mutate({ userId: u.id, ban: u.isActive })}
                            disabled={banMutation.isPending}
                            title={!u.isActive ? 'Unban user' : 'Ban user'}
                            className={cn(
                              'p-1.5 rounded transition-colors',
                              !u.isActive
                                ? 'text-green-400 hover:bg-green-400/15'
                                : 'text-red-400 hover:bg-red-400/15'
                            )}
                          >
                            {!u.isActive ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => adminMutation.mutate({ userId: u.id, makeAdmin: !u.isAdmin })}
                            disabled={adminMutation.isPending}
                            title={u.isAdmin ? 'Remove admin' : 'Make admin'}
                            className={cn(
                              'p-1.5 rounded transition-colors',
                              u.isAdmin
                                ? 'text-amber-400 hover:bg-amber-400/15'
                                : 'text-text-disabled hover:bg-elevated'
                            )}
                          >
                            <Crown className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination page={page} pages={usersData?.pages ?? 1} onPage={setPage} />
        </motion.div>
      )}

      {/* ── Bookings ── */}
      {tab === 'bookings' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {loadingBookings ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-violet" /></div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr className="text-text-disabled text-xs uppercase">
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium">Event</th>
                    <th className="px-4 py-3 text-center font-medium">Amount</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(bookingsData?.bookings ?? []).map(b => (
                    <tr key={b.id} className="hover:bg-elevated/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">{b.initiator.fullName ?? '—'}</p>
                        <p className="text-text-disabled text-xs">{b.initiator.email}</p>
                      </td>
                      <td className="px-4 py-3 text-text-secondary max-w-[200px] truncate">{b.event.title}</td>
                      <td className="px-4 py-3 text-center text-text-primary font-medium">
                        ₹{Number(b.finalAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          b.status === 'CONFIRMED'        ? 'bg-green-400/15 text-green-400'  :
                          b.status === 'PAYMENT_PENDING'  ? 'bg-amber-400/15 text-amber-400'  :
                          b.status === 'CANCELLED'        ? 'bg-red-400/15 text-red-400'      :
                                                            'bg-elevated text-text-secondary'
                        )}>
                          {b.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-text-secondary">{formatDate(b.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination page={page} pages={bookingsData?.pages ?? 1} onPage={setPage} />
        </motion.div>
      )}
    </div>
  )
}

/* ── Pagination helper ── */

function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-disabled">Page {page} of {pages}</span>
      <div className="flex gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="btn-ghost p-2 disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="btn-ghost p-2 disabled:opacity-40"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
