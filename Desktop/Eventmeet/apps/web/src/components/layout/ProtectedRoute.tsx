import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

export function ProtectedRoute() {
  const { isAuth } = useAuthStore()
  return isAuth ? <Outlet /> : <Navigate to="/login" replace />
}
