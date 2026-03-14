import axios from 'axios'

export const api = axios.create({
  baseURL: '/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token from memory on every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { data } = await axios.post('/v1/auth/refresh', {}, { withCredentials: true })
        sessionStorage.setItem('access_token', data.data.accessToken)
        original.headers.Authorization = `Bearer ${data.data.accessToken}`
        return api(original)
      } catch {
        sessionStorage.removeItem('access_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
