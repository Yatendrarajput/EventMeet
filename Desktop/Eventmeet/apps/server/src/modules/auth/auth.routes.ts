import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { validate } from '@/shared/middleware/validate'
import { authenticate } from '@/shared/middleware/authenticate'
import * as schema from './auth.schema'
import * as controller from './auth.controller'

// Stricter rate limit for auth endpoints (10 req per 15 min per IP)
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many attempts, try again in 15 minutes' },
  },
})

export const authRouter = Router()

authRouter.post('/register',    authRateLimit, validate({ body: schema.registerBody }),      controller.registerController)
authRouter.post('/login',       authRateLimit, validate({ body: schema.loginBody }),         controller.loginController)
authRouter.post('/refresh',                    validate({ body: schema.refreshBody }),        controller.refreshController)
authRouter.post('/logout',      authenticate,  validate({ body: schema.logoutBody }),        controller.logoutController)
authRouter.post('/verify-email',               validate({ body: schema.verifyEmailBody }),   controller.verifyEmailController)
authRouter.post('/forgot-password', authRateLimit, validate({ body: schema.forgotPasswordBody }), controller.forgotPasswordController)
authRouter.post('/reset-password',             validate({ body: schema.resetPasswordBody }), controller.resetPasswordController)
