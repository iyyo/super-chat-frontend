export interface AuthUser {
  id: number
  username: string
  nickname?: string
  email?: string | null
}

export interface UserProfile {
  id: number
  username: string
  nickname: string
  email: string | null
}

export interface UpdateProfilePayload {
  nickname: string
}

export interface AuthTokens {
  accessToken: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterPayload {
  username: string
  password: string
  email?: string
}

export interface ResetPasswordPayload {
  account: string
  code: string
  password: string
}

export interface ForgotPasswordPayload {
  account: string
}

export interface LoginWithEmailPayload {
  email: string
  code: string
}

export interface SendLoginCodePayload {
  email: string
}

export interface AuthResponse {
  user: AuthUser
  accessToken: string
}

export interface RefreshResponse {
  accessToken: string
}
