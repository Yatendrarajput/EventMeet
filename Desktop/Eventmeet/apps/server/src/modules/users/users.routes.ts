import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '@/shared/middleware/authenticate'
import { validate } from '@/shared/middleware/validate'
import * as schema from './users.schema'
import * as controller from './users.controller'

// Memory storage — buffer passed directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },   // 5MB max
  fileFilter(_req, file, cb) {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'))
    }
  },
})

export const usersRouter = Router()

// All users routes require authentication
usersRouter.use(authenticate)

usersRouter.get('/me',          controller.getMeController)
usersRouter.patch('/me',        validate({ body: schema.updateProfileBody }), controller.updateMeController)
usersRouter.delete('/me',       controller.deleteMeController)
usersRouter.post('/me/avatar',  upload.single('avatar'), controller.uploadAvatarController)
usersRouter.get('/:id',         validate({ params: schema.userIdParams }), controller.getUserByIdController)
