import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Clock, Send, MapPin, MessageCircle, UserX,
  CheckCircle, XCircle, Loader2, Zap, Calendar
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn, formatDate, getInitials } from '@/lib/utils'

/* ── Types ── */

interface ConnectedUser {
  id: string
  fullName: string
  avatarUrl: string | null
  city: string | null
}

interface EventSnippet {
  id: string
  title: string
}

interface Connection {
  id: string
  message: string | null
  respondedAt: string | null
  createdAt: string
  event: EventSnippet
  connectedUser: ConnectedUser
}

interface PendingRequest {
  id: string
  message: string | null
  isQuickConnect: boolean
  createdAt: string
  event: EventSnippet
  sender: {
    id: string
    fullName: string
    avatarUrl: string | null
    city: string | null
    bio: string | null
  }
}

interface SentRequest {
  id: string
  message: string | null
  isQuickConnect: boolean
  createdAt: string
  event: EventSnippet
  receiver: {
    id: string
    fullName: string
    avatarUrl: string | null
    city: string | null
  }
}

type Tab = 'connections' | 'requests' | 'sent'

/* ── Page ── */

export default function Connections() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = (searchParams.get('tab') as Tab) || 'connections'
  const setTab = (t: Tab) => {
    if (t === 'connections') setSearchParams({}, { replace: true })
    else setSearchParams({ tab: t }, { replace: true })
  }

  const { data: connectionsData, isLoading: loadingConnections, isError: errorConnections } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const res = await api.get('/connections')
      return { connections: res.data.data as Connection[], total: res.data.pagination.total as number }
    },
  })

  const { data: pendingData, isLoading: loadingPending, isError: errorPending } = useQuery({
    queryKey: ['connections-pending'],
    queryFn: async () => {
      const res = await api.get('/connections/pending')
      return { requests: res.data.data as PendingRequest[], total: res.data.pagination.total as number }
    },
  })

  const { data: sentData, isLoading: loadingSent, isError: errorSent } = useQuery({
    queryKey: ['connections-sent'],
    queryFn: async () => {
      const res = await api.get('/connections/sent')
      return { requests: res.data.data as SentRequest[], total: res.data.pagination.total as number }
    },
  })

  const pendingCount = pendingData?.total ?? 0

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'connections', label: 'Connections', icon: <Users className="w-4 h-4" />, count: connectionsData?.total },
    { key: 'requests',    label: 'Requests',    icon: <Clock className="w-4 h-4" />,   count: pendingCount },
    { key: 'sent',        label: 'Sent',        icon: <Send className="w-4 h-4" />,    count: sentData?.total },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Connections</h1>
        <p className="text-text-secondary text-sm mt-0.5">People you've met at events</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-xl p-1 border border-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 text-sm py-2 px-3 rounded-lg transition-all',
              tab === t.key
                ? 'bg-violet text-white font-medium shadow-violet'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            {t.count !== undefined && t.count > 0 && (
              <span className={cn(
                'text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center',
                tab === t.key ? 'bg-white/20' : 'bg-violet/20 text-violet-light'
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {tab === 'connections' && (
            <ConnectionsTab
              connections={connectionsData?.connections ?? []}
              isLoading={loadingConnections}
              isError={errorConnections}
            />
          )}
          {tab === 'requests' && (
            <RequestsTab
              requests={pendingData?.requests ?? []}
              isLoading={loadingPending}
              isError={errorPending}
            />
          )}
          {tab === 'sent' && (
            <SentTab
              requests={sentData?.requests ?? []}
              isLoading={loadingSent}
              isError={errorSent}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ── Connections Tab ── */

function ConnectionsTab({ connections, isLoading, isError }: { connections: Connection[]; isLoading: boolean; isError: boolean }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [startingChat, setStartingChat] = useState<string | null>(null)

  async function handleMessage(conn: Connection) {
    setStartingChat(conn.id)
    try {
      const res = await api.post('/conversations', {
        type: 'DIRECT',
        eventId: conn.event.id,
        memberIds: [conn.connectedUser.id],
      })
      const conversationId = res.data.data.id
      // Invalidate so Conversations page loads the fresh list including this DM
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      navigate('/conversations', { state: { conversationId } })
    } catch {
      navigate('/conversations')
    } finally {
      setStartingChat(null)
    }
  }

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/connections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })

  if (isLoading) return <TabSkeleton />
  if (isError) return <ErrorState />

  if (connections.length === 0) return (
    <EmptyState
      icon={<Users className="w-10 h-10 text-text-disabled" />}
      title="No connections yet"
      body="Mark yourself as going to an event and connect with people who'll be there."
    />
  )

  return (
    <div className="space-y-3">
      {connections.map(conn => (
        <div key={conn.id} className="card flex items-center gap-3">
          <Avatar user={conn.connectedUser} />
          <div className="flex-1 min-w-0">
            <p className="text-text-primary font-medium text-sm truncate">{conn.connectedUser.fullName}</p>
            {conn.connectedUser.city && (
              <p className="text-text-disabled text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {conn.connectedUser.city}
              </p>
            )}
            <p className="text-text-disabled text-xs flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              <span className="truncate">via {conn.event.title}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleMessage(conn)}
              disabled={startingChat === conn.id}
              title="Message"
              className="w-8 h-8 rounded-lg bg-violet/10 hover:bg-violet/20 flex items-center justify-center transition-colors"
            >
              {startingChat === conn.id
                ? <Loader2 className="w-4 h-4 text-violet animate-spin" />
                : <MessageCircle className="w-4 h-4 text-violet" />
              }
            </button>
            <button
              onClick={() => removeMutation.mutate(conn.id)}
              disabled={removeMutation.isPending}
              title="Remove connection"
              className="w-8 h-8 rounded-lg bg-pink/10 hover:bg-pink/20 flex items-center justify-center transition-colors"
            >
              {removeMutation.isPending
                ? <Loader2 className="w-4 h-4 text-pink animate-spin" />
                : <UserX className="w-4 h-4 text-pink" />
              }
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Requests Tab ── */

function RequestsTab({ requests, isLoading, isError }: { requests: PendingRequest[]; isLoading: boolean; isError: boolean }) {
  const queryClient = useQueryClient()

  const respondMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'ACCEPT' | 'DECLINE' | 'BLOCK' }) =>
      api.patch(`/connections/${id}/respond`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections-pending'] })
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })

  if (isLoading) return <TabSkeleton />
  if (isError) return <ErrorState />

  if (requests.length === 0) return (
    <EmptyState
      icon={<Clock className="w-10 h-10 text-text-disabled" />}
      title="No pending requests"
      body="When someone wants to connect with you at an event, it'll appear here."
    />
  )

  return (
    <div className="space-y-3">
      {requests.map(req => (
        <div key={req.id} className="card space-y-3">
          <div className="flex items-start gap-3">
            <Avatar user={req.sender} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-text-primary font-medium text-sm">{req.sender.fullName}</p>
                {req.isQuickConnect && (
                  <span className="flex items-center gap-0.5 text-xs text-yellow-400 bg-yellow-400/10 rounded-full px-2 py-0.5">
                    <Zap className="w-3 h-3" /> Quick Connect
                  </span>
                )}
              </div>
              {req.sender.city && (
                <p className="text-text-disabled text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {req.sender.city}
                </p>
              )}
              <p className="text-text-disabled text-xs flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3" />
                <span className="truncate">at {req.event.title}</span>
              </p>
            </div>
            <span className="text-text-disabled text-xs flex-shrink-0">{formatDate(req.createdAt)}</span>
          </div>

          {req.sender.bio && (
            <p className="text-text-secondary text-xs bg-elevated rounded-lg px-3 py-2 leading-relaxed line-clamp-2">
              {req.sender.bio}
            </p>
          )}

          {req.message && (
            <p className="text-text-secondary text-xs italic border-l-2 border-violet/40 pl-3">
              "{req.message}"
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => respondMutation.mutate({ id: req.id, action: 'ACCEPT' })}
              disabled={respondMutation.isPending}
              className="btn btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1.5"
            >
              {respondMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <><CheckCircle className="w-3.5 h-3.5" /> Accept</>
              }
            </button>
            <button
              onClick={() => respondMutation.mutate({ id: req.id, action: 'DECLINE' })}
              disabled={respondMutation.isPending}
              className="btn btn-ghost border border-border flex-1 text-xs py-2 flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" /> Decline
            </button>
            <button
              onClick={() => respondMutation.mutate({ id: req.id, action: 'BLOCK' })}
              disabled={respondMutation.isPending}
              title="Block this user"
              className="btn btn-ghost border border-border px-3 py-2 text-xs text-pink hover:bg-pink/10"
            >
              Block
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Sent Tab ── */

function SentTab({ requests, isLoading, isError }: { requests: SentRequest[]; isLoading: boolean; isError: boolean }) {
  const queryClient = useQueryClient()

  const withdrawMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/connections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections-sent'] })
    },
  })

  if (isLoading) return <TabSkeleton />
  if (isError) return <ErrorState />

  if (requests.length === 0) return (
    <EmptyState
      icon={<Send className="w-10 h-10 text-text-disabled" />}
      title="No sent requests"
      body="You haven't sent any connection requests yet."
    />
  )

  return (
    <div className="space-y-3">
      {requests.map(req => (
        <div key={req.id} className="card flex items-center gap-3">
          <Avatar user={req.receiver} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-text-primary font-medium text-sm truncate">{req.receiver.fullName}</p>
              {req.isQuickConnect && (
                <span className="flex items-center gap-0.5 text-xs text-yellow-400 bg-yellow-400/10 rounded-full px-2 py-0.5">
                  <Zap className="w-3 h-3" /> Quick
                </span>
              )}
            </div>
            {req.receiver.city && (
              <p className="text-text-disabled text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {req.receiver.city}
              </p>
            )}
            <p className="text-text-disabled text-xs flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              <span className="truncate">at {req.event.title}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className="badge badge-violet text-xs">Pending</span>
            <button
              onClick={() => withdrawMutation.mutate(req.id)}
              disabled={withdrawMutation.isPending}
              className="text-xs text-text-disabled hover:text-pink transition-colors"
            >
              {withdrawMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Withdraw'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Shared sub-components ── */

function ErrorState() {
  return (
    <div className="card text-center py-10 space-y-2">
      <p className="text-pink font-medium">Failed to load</p>
      <p className="text-text-secondary text-sm">Could not fetch data. Check your connection and try again.</p>
    </div>
  )
}

function Avatar({ user }: { user: { fullName: string; avatarUrl: string | null } }) {
  return (
    <div className="w-11 h-11 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
      {user.avatarUrl
        ? <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
        : <span>{getInitials(user.fullName)}</span>
      }
    </div>
  )
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card text-center py-12 space-y-3">
      <div className="flex justify-center">{icon}</div>
      <p className="text-text-primary font-medium">{title}</p>
      <p className="text-text-secondary text-sm max-w-xs mx-auto">{body}</p>
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="card flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-elevated animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 bg-elevated rounded animate-pulse" />
            <div className="h-2.5 w-20 bg-elevated rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
