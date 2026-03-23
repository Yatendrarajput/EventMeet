import { useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { getInitials } from '@/lib/utils'

export function MobileHeader() {
  const { user } = useAuthStore()
  const navigate  = useNavigate()

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-surface border-b border-border h-14 flex items-center justify-between px-4">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-white" fill="white" />
        </div>
        <span className="text-base font-bold gradient-text">EventMeet</span>
      </div>

      {/* Avatar → profile */}
      <button
        onClick={() => navigate('/profile')}
        className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0"
      >
        {user?.avatarUrl
          ? <img src={user.avatarUrl} alt={user.fullName ?? ''} className="w-full h-full object-cover" />
          : getInitials(user?.fullName ?? 'U')
        }
      </button>
    </header>
  )
}
