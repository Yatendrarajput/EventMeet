import { Outlet } from 'react-router-dom'
import { Sidebar }       from './Sidebar'
import { BottomNav }     from './BottomNav'
import { MobileHeader }  from './MobileHeader'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-base">
      <MobileHeader />
      <Sidebar />

      {/* pt-14 on mobile to clear fixed header; pb-20 for bottom nav; lg resets both */}
      <main className="lg:ml-60 min-h-screen pt-14 pb-20 lg:pt-0 lg:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8 lg:py-8 animate-fade-in">
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
