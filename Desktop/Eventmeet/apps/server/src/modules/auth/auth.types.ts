export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthUser {
  id: string
  email: string
  fullName: string
  isVerified: boolean
  emailVerifiedAt: Date | null
}
