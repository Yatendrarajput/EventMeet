import { NavLink } from 'react-router-dom'
import { CalendarDays, Users, MessageCircle, Ticket, Bell } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

const tabs = [
  { to: '/events',        icon: CalendarDays,  label: 'Events' },
  { to: '/connections',   icon: Users,         label: 'Connect' },
  { to: '/conversations', icon: MessageCircle, label: 'Chat' },
  { to: '/bookings',      icon: Ticket,        label: 'Tickets' },
  { to: '/notifications', icon: Bell,          label: 'Alerts' },
]

export function BottomNav() {
  const { data } = useQuery({
    queryKey: ['notif-unread-count'],
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count')
      return res.data.data as { unreadCount: number }
    },
    refetchInterval: 60_000,
  })
  const unreadCount = data?.unreadCount ?? 0

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all duration-200 min-w-0 flex-1',
                isActive ? 'text-violet-light' : 'text-text-disabled'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn('relative p-1.5 rounded-lg transition-all', isActive && 'bg-violet/15')}>
                  <Icon className={cn('w-5 h-5', isActive ? 'text-violet' : 'text-text-disabled')} />
                  {to === '/notifications' && unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-violet text-white text-[9px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
