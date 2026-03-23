import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Zap, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
              .regex(/[A-Z]/, 'Must contain an uppercase letter')
              .regex(/[0-9]/, 'Must contain a number'),
})
type FormData = z.infer<typeof schema>

export default function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError]   = useState('')
  const [success, setSuccess]           = useState(false)
  const { setAuth } = useAuthStore()
  const navigate    = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      setServerError('')
      const res = await api.post('/auth/register', data)
      const { user, tokens } = res.data.data
      setAuth(user, tokens.accessToken)
      setSuccess(true)
      setTimeout(() => navigate('/events'), 2000)
    } catch (err: any) {
      setServerError(err.response?.data?.error?.message ?? 'Registration failed. Try again.')
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎉</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">You're in!</h2>
          <p className="text-text-secondary">Check your email to verify your account. Redirecting to events…</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-surface border-r border-border">
        <div className="absolute inset-0 bg-gradient-brand opacity-10" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-violet/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-pink/15 rounded-full blur-[60px]" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link to="/" className="flex items-center gap-2.5 mb-16">
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" fill="white" />
            </div>
            <span className="text-2xl font-bold gradient-text">EventMeet</span>
          </Link>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Join thousands<br />
            <span className="gradient-text">already out there.</span>
          </h2>
          <p className="text-text-secondary text-lg">
            Free forever. No credit card. Just events, people, and good times.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="text-lg font-bold gradient-text">EventMeet</span>
          </Link>

          <h1 className="text-2xl font-bold mb-1">Create your account</h1>
          <p className="text-text-secondary text-sm mb-8">
            Already have one?{' '}
            <Link to="/login" className="text-violet-light hover:text-violet transition-colors font-medium">
              Sign in
            </Link>
          </p>

          {serverError && (
            <div className="bg-error/10 border border-error/30 text-error w-full mb-6 py-3 px-4 rounded text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Full name</label>
              <input
                {...register('fullName')}
                type="text"
                placeholder="Your name"
                className={cn('input', errors.fullName && 'border-error')}
                autoComplete="name"
              />
              {errors.fullName && <p className="text-error text-xs mt-1.5">{errors.fullName.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className={cn('input', errors.email && 'border-error')}
                autoComplete="email"
              />
              {errors.email && <p className="text-error text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className={cn('input pr-10', errors.password && 'border-error')}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-disabled hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-error text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 mt-2">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create account'}
            </button>

            <p className="text-center text-xs text-text-disabled">
              By signing up you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
