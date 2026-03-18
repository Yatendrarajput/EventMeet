export interface UpdateProfileInput {
  fullName?: string
  username?: string
  bio?: string
  dateOfBirth?: string   // ISO date string — converted to Date in service
  gender?: string
  phoneNumber?: string
  city?: string
  state?: string
  interests?: string[]
  lookingFor?: string[]
}

// Fields returned for own profile (GET /me)
export interface OwnProfile {
  id: string
  email: string
  fullName: string
  username: string | null
  bio: string | null
  dateOfBirth: Date | null
  gender: string | null
  phoneNumber: string | null
  avatarUrl: string | null
  city: string | null
  state: string | null
  interests: string[]
  lookingFor: string[]
  isVerified: boolean
  emailVerifiedAt: Date | null
  averageRating: unknown   // Decimal — serialized as string by Prisma
  totalRatings: number
  lastLoginAt: Date | null
  createdAt: Date
}

// Fields returned for public profile (GET /:id)
export interface PublicProfile {
  id: string
  fullName: string
  username: string | null
  bio: string | null
  avatarUrl: string | null
  city: string | null
  interests: string[]
  lookingFor: string[]
  isVerified: boolean
  averageRating: unknown
  totalRatings: number
  createdAt: Date
}
