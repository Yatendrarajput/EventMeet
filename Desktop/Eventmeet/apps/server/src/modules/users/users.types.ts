export interface UpdateProfileInput {
  fullName?: string
  username?: string
  bio?: string
  dateOfBirth?: string
  gender?: string
  phoneNumber?: string
  city?: string
  state?: string
  interests?: string[]
  lookingFor?: string[]
}

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
  averageRating: unknown
  totalRatings: number
  lastLoginAt: Date | null
  createdAt: Date
}

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
