import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  fullName: string
  avatarUrl?: string | null
  isVerified: boolean
  isAdmin: boolean
}

interface AuthState {
  user:         User | null
  accessToken:  string | null
  isAuth:       boolean
  setAuth:      (user: User, token: string) => void
  setToken:     (token: string) => void
  logout:       () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:        null,
      accessToken: null,
      isAuth:      false,

      setAuth: (user, token) => {
        sessionStorage.setItem('access_token', token)
        set({ user, accessToken: token, isAuth: true })
      },

      setToken: (token) => {
        sessionStorage.setItem('access_token', token)
        set({ accessToken: token })
      },

      logout: () => {
        sessionStorage.removeItem('access_token')
        set({ user: null, accessToken: null, isAuth: false })
      },
    }),
    {
      name: 'eventmeet-auth',
      partialize: (s) => ({ user: s.user, isAuth: s.isAuth }),
    }
  )
)
