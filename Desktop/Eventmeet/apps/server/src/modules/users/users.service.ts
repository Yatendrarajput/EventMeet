import { v2 as cloudinary } from 'cloudinary'
import { prisma } from '@/lib/prisma'
import { redis, RedisKeys, RedisTTL } from '@/lib/redis'
import { config } from '@/config'
import { AppError } from '@/shared/middleware/errorHandler'
import type { UpdateProfileInput, OwnProfile, PublicProfile } from './users.types'

if (config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key:    config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
  })
}

const ownProfileSelect = {
  id: true, email: true, fullName: true, username: true, bio: true,
  dateOfBirth: true, gender: true, phoneNumber: true, avatarUrl: true,
  city: true, state: true, interests: true, lookingFor: true,
  isVerified: true, emailVerifiedAt: true, averageRating: true,
  totalRatings: true, lastLoginAt: true, createdAt: true,
} as const

const publicProfileSelect = {
  id: true, fullName: true, username: true, bio: true, avatarUrl: true,
  city: true, interests: true, lookingFor: true, isVerified: true,
  averageRating: true, totalRatings: true, createdAt: true,
} as const

export async function getMe(userId: string): Promise<OwnProfile> {
  const cached = await redis.get(RedisKeys.userProfile(userId))
  if (cached) return JSON.parse(cached) as OwnProfile

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: ownProfileSelect,
  })

  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found')

  await redis.setex(RedisKeys.userProfile(userId), RedisTTL.userProfile, JSON.stringify(user))
  return user as OwnProfile
}

export async function updateMe(userId: string, input: UpdateProfileInput): Promise<OwnProfile> {
  if (input.username) {
    const taken = await prisma.user.findFirst({
      where: { username: input.username, NOT: { id: userId } },
      select: { id: true },
    })
    if (taken) throw new AppError(409, 'USERNAME_TAKEN', 'Username is already taken')
  }

  const data: Record<string, unknown> = { ...input }
  if (input.dateOfBirth) data.dateOfBirth = new Date(input.dateOfBirth)

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: ownProfileSelect,
  })

  await redis.del(RedisKeys.userProfile(userId))
  return user as OwnProfile
}

export async function getUserById(viewerId: string, targetId: string): Promise<PublicProfile> {
  const block = await prisma.block.findFirst({
    where: { OR: [{ blockerId: viewerId, blockedId: targetId }, { blockerId: targetId, blockedId: viewerId }] },
    select: { id: true },
  })

  if (block) throw new AppError(404, 'USER_NOT_FOUND', 'User not found')

  const user = await prisma.user.findFirst({
    where: { id: targetId, deletedAt: null, isActive: true },
    select: publicProfileSelect,
  })

  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
  return user as PublicProfile
}

export async function deleteMe(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), isActive: false },
  })
  await redis.del(RedisKeys.userProfile(userId))
}

export async function uploadAvatar(userId: string, fileBuffer: Buffer, mimetype: string): Promise<{ avatarUrl: string }> {
  if (!config.CLOUDINARY_CLOUD_NAME) {
    throw new AppError(503, 'CLOUDINARY_NOT_CONFIGURED', 'Avatar upload is not configured yet')
  }

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'eventmeet/avatars',
        public_id: `user_${userId}`,
        overwrite: true,
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        resource_type: 'image',
      },
      (error, res) => {
        if (error || !res) return reject(error ?? new Error('Upload failed'))
        resolve(res as { secure_url: string })
      }
    ).end(fileBuffer)
  })

  await prisma.user.update({ where: { id: userId }, data: { avatarUrl: result.secure_url } })
  await redis.del(RedisKeys.userProfile(userId))
  return { avatarUrl: result.secure_url }
}
