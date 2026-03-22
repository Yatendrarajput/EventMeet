import { Outlet } from 'react-router-dom'
import { Sidebar }   from './Sidebar'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-base">
      <Sidebar />

      {/* Main content — offset for sidebar on desktop, add padding for bottom nav on mobile */}
      <main className="lg:ml-60 min-h-screen pb-20 lg:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8 lg:py-8 animate-fade-in">
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
