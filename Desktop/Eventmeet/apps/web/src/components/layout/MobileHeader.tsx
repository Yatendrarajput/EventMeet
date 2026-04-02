import { useNavigate } from 'react-router-dom'
import { Zap, LogOut } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { getInitials } from '@/lib/utils'

export function MobileHeader() {
  const { user, logout } = useAuthStore()
  const navigate  = useNavigate()
  const queryClient = useQueryClient()

  const handleLogout = () => {
    queryClient.clear()
    logout()
    navigate('/login')
  }

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-surface border-b border-border h-14 flex items-center justify-between px-4">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-white" fill="white" />
        </div>
        <span className="text-base font-bold gradient-text">EventMeet</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/profile')}
          className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0"
        >
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt={user.fullName ?? ''} className="w-full h-full object-cover" />
            : getInitials(user?.fullName ?? 'U')
          }
        </button>
        <button
          onClick={handleLogout}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-error hover:bg-error/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
