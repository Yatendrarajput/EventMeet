import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CalendarDays, Users, MessageCircle, Ticket,
  Bell, Settings, LogOut, Zap, LayoutDashboard,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

const navItems = [
  { to: '/events',        icon: CalendarDays,    label: 'Events' },
  { to: '/connections',   icon: Users,           label: 'Connections' },
  { to: '/conversations', icon: MessageCircle,   label: 'Messages' },
  { to: '/bookings',      icon: Ticket,          label: 'Bookings' },
  { to: '/notifications', icon: Bell,            label: 'Notifications' },
]

export function Sidebar() {
  const { user, logout, isAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="hidden lg:flex flex-col w-60 h-screen bg-surface border-r border-border fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-border">
        <NavLink to="/events" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="text-lg font-bold gradient-text">EventMeet</span>
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-violet/15 text-violet-light'
                  : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('w-4.5 h-4.5 flex-shrink-0', isActive ? 'text-violet' : 'text-text-secondary group-hover:text-text-primary')} />
                {label}
                {to === '/notifications' && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-pink" />
                )}
              </>
            )}
          </NavLink>
        ))}

        {user?.isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-200',
                isActive ? 'bg-violet/15 text-violet-light' : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
              )
            }
          >
            <LayoutDashboard className="w-4.5 h-4.5 flex-shrink-0" />
            Admin
          </NavLink>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded hover:bg-elevated transition-colors cursor-pointer" onClick={() => navigate('/profile')}>
          <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt={user.fullName} className="w-8 h-8 rounded-full object-cover" />
              : getInitials(user?.fullName ?? 'U')
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{user?.fullName}</p>
            <p className="text-xs text-text-secondary truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-ghost w-full justify-start gap-3 mt-1 text-error hover:text-error hover:bg-error/10">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
