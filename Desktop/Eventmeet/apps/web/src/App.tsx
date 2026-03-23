import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout }      from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import Landing    from '@/pages/Landing'
import Login      from '@/pages/auth/Login'
import Register   from '@/pages/auth/Register'
import Events      from '@/pages/Events'
import EventDetail  from '@/pages/EventDetail'
import Profile      from '@/pages/Profile'
import Connections    from '@/pages/Connections'
import Conversations  from '@/pages/Conversations'
import Bookings       from '@/pages/Bookings'
import BookingNew     from '@/pages/BookingNew'
import Notifications  from '@/pages/Notifications'
import Admin          from '@/pages/Admin'

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"         element={<Landing />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected — app shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/events"        element={<Events />} />
          <Route path="/events/:id"    element={<EventDetail />} />
          <Route path="/connections"   element={<Connections />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/bookings"      element={<Bookings />} />
          <Route path="/bookings/new"  element={<BookingNew />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile"       element={<Profile />} />
          <Route path="/admin"         element={<Admin />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
