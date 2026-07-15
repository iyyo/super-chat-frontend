import { api } from '@/lib/api/client'
import type {
  AuthResponse,
  ForgotPasswordPayload,
  LoginPayload,
  LoginWithEmailPayload,
  RefreshResponse,
  RegisterPayload,
  ResetPasswordPayload,
  SendLoginCodePayload,
  UpdateProfilePayload,
  UserProfile,
} from '@/types/auth'

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', payload),

  sendLoginCode: (payload: SendLoginCodePayload) =>
    api.post<{ message: string }>('/auth/login/email/send-code', payload),

  loginWithEmail: (payload: LoginWithEmailPayload) =>
    api.post<AuthResponse>('/auth/login/email', payload),

  register: (payload: RegisterPayload) =>
    api.post<AuthResponse>('/auth/register', payload),

  refresh: () => api.post<RefreshResponse>('/auth/refresh'),

  logout: () => api.post<{ message: string }>('/auth/logout'),

  forgotPassword: (payload: ForgotPasswordPayload) =>
    api.post<{ message: string }>('/auth/forgot-password', payload),

  resetPassword: (payload: ResetPasswordPayload) =>
    api.post<{ message: string }>('/auth/reset-password', payload),

  me: () => api.get<UserProfile>('/auth/me', { skipToast: true }),

  updateProfile: (payload: UpdateProfilePayload) =>
    api.patch<UserProfile>('/auth/profile', payload, { skipToast: true }),
}
