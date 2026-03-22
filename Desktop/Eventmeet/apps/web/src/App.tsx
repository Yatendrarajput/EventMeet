import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout }      from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import Landing    from '@/pages/Landing'
import Login      from '@/pages/auth/Login'
import Register   from '@/pages/auth/Register'
import Events     from '@/pages/Events'
import ComingSoon from '@/pages/ComingSoon'

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
          <Route path="/events/:id"    element={<ComingSoon title="Event Detail" />} />
          <Route path="/connections"   element={<ComingSoon title="Connections" />} />
          <Route path="/conversations" element={<ComingSoon title="Messages" />} />
          <Route path="/bookings"      element={<ComingSoon title="My Bookings" />} />
          <Route path="/notifications" element={<ComingSoon title="Notifications" />} />
          <Route path="/profile"       element={<ComingSoon title="Profile" />} />
          <Route path="/admin"         element={<ComingSoon title="Admin Dashboard" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
