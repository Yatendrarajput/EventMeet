import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, ArrowLeft, Send, Trash2,
  Loader2, Users, Zap, Calendar
} from 'lucide-react'
import { api } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { cn, formatTime, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

/* ── Types ── */

interface ConvMember {
  id: string
  role: string
  user: { id: string; fullName: string; avatarUrl: string | null }
}

interface Conversation {
  id: string
  type: 'DIRECT' | 'GROUP'
  name: string | null
  status: string
  lastMessageAt: string | null
  lastMessagePreview: string | null
  createdAt: string
  event: { id: string; title: string }
  members: ConvMember[]
}

interface Message {
  id: string
  content: string
  type: string
  status: string
  createdAt: string
  sender: { id: string; fullName: string; avatarUrl: string | null }
}

/* ── Helpers ── */

function otherUser(conv: Conversation, myId: string) {
  return conv.members.find(m => m.user.id !== myId)?.user ?? null
}

function convDisplayName(conv: Conversation, myId: string): string {
  if (conv.type === 'GROUP') return conv.name ?? 'Group chat'
  return otherUser(conv, myId)?.fullName ?? 'Unknown'
}

function convAvatar(conv: Conversation, myId: string) {
  if (conv.type === 'GROUP') return null
  return otherUser(conv, myId)?.avatarUrl ?? null
}

/* ── Main Page ── */

export default function Conversations() {
  const myId = useAuthStore(s => s.user?.id ?? '')
  const location = useLocation()
  const [selectedId, setSelectedId] = useState<string | null>(
    (location.state as { conversationId?: string } | null)?.conversationId ?? null
  )

  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await api.get('/conversations')
      return {
        conversations: res.data.data as Conversation[],
        total: res.data.pagination.total as number,
      }
    },
    staleTime: 0,
  })

  const conversations = data?.conversations ?? []
  const selected = conversations.find(c => c.id === selectedId) ?? null

  // On mobile, show thread only if conversation selected
  const showThread = !!selectedId

  return (
    <div className="flex h-[calc(100vh-5rem)] -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden rounded-xl border border-border bg-surface">

      {/* ── Left: Conversation list ── */}
      <div className={cn(
        'flex flex-col border-r border-border',
        'w-full lg:w-80 flex-shrink-0',
        selectedId && 'hidden lg:flex'
      )}>
        <div className="px-4 py-4 border-b border-border">
          <h1 className="text-lg font-bold text-text-primary">Messages</h1>
          <p className="text-text-disabled text-xs">{data?.total ?? 0} conversations</p>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {isLoading ? (
            <ConvListSkeleton />
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center space-y-3">
              <MessageCircle className="w-10 h-10 text-text-disabled" />
              <p className="text-text-primary font-medium">No messages yet</p>
              <p className="text-text-secondary text-sm">Connect with people at events to start chatting.</p>
            </div>
          ) : (
            conversations.map(conv => (
              <ConvListItem
                key={conv.id}
                conv={conv}
                myId={myId}
                selected={conv.id === selectedId}
                onClick={() => setSelectedId(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right: Thread ── */}
      <div className={cn(
        'flex-1 flex flex-col',
        !showThread && 'hidden lg:flex'
      )}>
        {selected ? (
          <Thread
            conv={selected}
            myId={myId}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full space-y-3 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-violet/10 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-violet" />
            </div>
            <p className="text-text-primary font-medium">Select a conversation</p>
            <p className="text-text-secondary text-sm">Choose a conversation from the left to start messaging.</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Conversation List Item ── */

function ConvListItem({ conv, myId, selected, onClick }: {
  conv: Conversation
  myId: string
  selected: boolean
  onClick: () => void
}) {
  const name    = convDisplayName(conv, myId)
  const avatar  = convAvatar(conv, myId)
  const isGroup = conv.type === 'GROUP'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-3 px-4 py-3.5 border-b border-border/50 transition-colors hover:bg-elevated',
        selected && 'bg-violet/5 border-l-2 border-l-violet'
      )}
    >
      {/* Avatar */}
      <div className={cn(
        'w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden',
        isGroup ? 'bg-pink/20 text-pink' : 'bg-gradient-brand'
      )}>
        {isGroup
          ? <Users className="w-5 h-5" />
          : avatar
            ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
            : <span>{getInitials(name)}</span>
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-text-primary text-sm font-medium truncate">{name}</p>
          {conv.lastMessageAt && (
            <span className="text-text-disabled text-[11px] flex-shrink-0">{formatTime(conv.lastMessageAt)}</span>
          )}
        </div>
        <p className="text-text-disabled text-xs truncate mt-0.5">
          {conv.lastMessagePreview ?? `via ${conv.event.title}`}
        </p>
      </div>
    </button>
  )
}

/* ── Thread ── */

function Thread({ conv, myId, onBack }: {
  conv: Conversation
  myId: string
  onBack: () => void
}) {
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const name   = convDisplayName(conv, myId)
  const avatar = convAvatar(conv, myId)

  /* Load messages */
  const { data: msgData, isLoading: loadingMsgs } = useQuery({
    queryKey: ['messages', conv.id],
    queryFn: async () => {
      const res = await api.get(`/conversations/${conv.id}/messages?limit=50`)
      return {
        messages: res.data.data as Message[],
        total: res.data.pagination.total as number,
      }
    },
    staleTime: 0,
  })

  const messages = msgData?.messages ?? []

  /* Scroll to bottom when messages load/update */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  /* Socket: join room + listen */
  useEffect(() => {
    const socket = getSocket()
    if (!socket.connected) socket.connect()

    socket.emit('join:conversation', conv.id)

    const onNew = ({ conversationId, message }: { conversationId: string; message: Message }) => {
      if (conversationId !== conv.id) return
      queryClient.setQueryData<{ messages: Message[]; total: number }>(
        ['messages', conv.id],
        old => old ? { ...old, messages: [...old.messages, message] } : old
      )
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }

    const onDeleted = ({ conversationId, messageId }: { conversationId: string; messageId: string }) => {
      if (conversationId !== conv.id) return
      queryClient.setQueryData<{ messages: Message[]; total: number }>(
        ['messages', conv.id],
        old => old ? { ...old, messages: old.messages.filter(m => m.id !== messageId) } : old
      )
    }

    const onTypingStart = ({ userId }: { userId: string }) => {
      if (userId === myId) return
      setTypingUsers(prev => new Set(prev).add(userId))
    }

    const onTypingStop = ({ userId }: { userId: string }) => {
      setTypingUsers(prev => { const s = new Set(prev); s.delete(userId); return s })
    }

    socket.on('message:new',     onNew)
    socket.on('message:deleted', onDeleted)
    socket.on('typing:start',    onTypingStart)
    socket.on('typing:stop',     onTypingStop)

    return () => {
      socket.emit('leave:conversation', conv.id)
      socket.off('message:new',     onNew)
      socket.off('message:deleted', onDeleted)
      socket.off('typing:start',    onTypingStart)
      socket.off('typing:stop',     onTypingStop)
    }
  }, [conv.id, myId, queryClient])

  /* Send message */
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      await api.post(`/conversations/${conv.id}/messages`, { content })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conv.id] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  const handleSend = () => {
    const content = text.trim()
    if (!content || sendMutation.isPending) return
    setText('')
    sendMutation.mutate(content)
  }

  /* Delete message */
  const deleteMutation = useMutation({
    mutationFn: (messageId: string) =>
      api.delete(`/conversations/${conv.id}/messages/${messageId}`),
    onSuccess: (_d, messageId) => {
      queryClient.setQueryData<{ messages: Message[]; total: number }>(
        ['messages', conv.id],
        old => old ? { ...old, messages: old.messages.filter(m => m.id !== messageId) } : old
      )
    },
  })

  /* Typing indicator */
  const emitTyping = useCallback(() => {
    const socket = getSocket()
    socket.emit('typing:start', { conversationId: conv.id, userId: myId })
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: conv.id, userId: myId })
    }, 2000)
  }, [conv.id, myId])

  /* Group typing users by name */
  const typingNames = conv.members
    .filter(m => typingUsers.has(m.user.id))
    .map(m => m.user.fullName.split(' ')[0])

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface flex-shrink-0">
        <button onClick={onBack} className="lg:hidden p-1.5 rounded-lg hover:bg-elevated transition-colors">
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>

        <div className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden',
          conv.type === 'GROUP' ? 'bg-pink/20 text-pink' : 'bg-gradient-brand'
        )}>
          {conv.type === 'GROUP'
            ? <Users className="w-4.5 h-4.5" />
            : avatar
              ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
              : <span>{getInitials(name)}</span>
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-text-primary font-medium text-sm truncate">{name}</p>
          <p className="text-text-disabled text-xs flex items-center gap-1 truncate">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            {conv.event.title}
            {conv.type === 'GROUP' && (
              <span className="ml-1 flex items-center gap-0.5">
                <Zap className="w-3 h-3" /> {conv.members.length} members
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 no-scrollbar">
        {loadingMsgs ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-violet animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2 text-center">
            <MessageCircle className="w-8 h-8 text-text-disabled" />
            <p className="text-text-secondary text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isOwn={msg.sender.id === myId}
              showAvatar={conv.type === 'GROUP' && msg.sender.id !== myId}
              showSender={
                conv.type === 'GROUP' &&
                msg.sender.id !== myId &&
                (idx === 0 || messages[idx - 1].sender.id !== msg.sender.id)
              }
              onDelete={msg.sender.id === myId ? () => deleteMutation.mutate(msg.id) : undefined}
            />
          ))
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {typingNames.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-2"
            >
              <div className="flex gap-1 items-center bg-elevated rounded-full px-3 py-2">
                <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-text-disabled text-xs">{typingNames.join(', ')} typing…</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3 flex items-end gap-2 bg-surface flex-shrink-0">
        <textarea
          rows={1}
          value={text}
          onChange={e => { setText(e.target.value); emitTyping() }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
          placeholder="Type a message…"
          className="input text-sm flex-1 resize-none leading-relaxed max-h-32 overflow-y-auto"
          style={{ height: 'auto' }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0',
            text.trim() ? 'bg-violet hover:bg-violet-light' : 'bg-elevated cursor-not-allowed'
          )}
        >
          {sendMutation.isPending
            ? <Loader2 className="w-4 h-4 text-white animate-spin" />
            : <Send className="w-4 h-4 text-white" />
          }
        </button>
      </div>
    </>
  )
}

/* ── Message Bubble ── */

function MessageBubble({ msg, isOwn, showAvatar, showSender, onDelete }: {
  msg: Message
  isOwn: boolean
  showAvatar: boolean
  showSender: boolean
  onDelete?: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={cn('flex items-end gap-2 group', isOwn ? 'flex-row-reverse' : 'flex-row')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar for group chats */}
      {showAvatar ? (
        <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden mb-0.5">
          {msg.sender.avatarUrl
            ? <img src={msg.sender.avatarUrl} alt={msg.sender.fullName} className="w-full h-full object-cover" />
            : <span>{getInitials(msg.sender.fullName)}</span>
          }
        </div>
      ) : (
        <div className="w-7 flex-shrink-0" />
      )}

      <div className={cn('flex flex-col max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
        {showSender && (
          <span className="text-text-disabled text-[11px] mb-1 px-1">{msg.sender.fullName}</span>
        )}

        <div className="flex items-end gap-1.5">
          {/* Delete button — own messages only, on hover */}
          {isOwn && onDelete && (
            <AnimatePresence>
              {hovered && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={onDelete}
                  className="p-1 rounded hover:bg-pink/10 text-text-disabled hover:text-pink transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          )}

          <div className={cn(
            'px-3.5 py-2 rounded-2xl text-sm leading-relaxed',
            isOwn
              ? 'bg-violet text-white rounded-br-sm'
              : 'bg-elevated text-text-primary rounded-bl-sm'
          )}>
            {msg.content}
          </div>
        </div>

        <span className="text-text-disabled text-[11px] mt-0.5 px-1">{formatTime(msg.createdAt)}</span>
      </div>
    </div>
  )
}

/* ── Skeleton ── */

function ConvListSkeleton() {
  return (
    <div>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50">
          <div className="w-11 h-11 rounded-full bg-elevated animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-28 bg-elevated rounded animate-pulse" />
            <div className="h-2.5 w-40 bg-elevated rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
