import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '@/lib/api/auth'
import type { AuthUser, LoginPayload, LoginWithEmailPayload, RegisterPayload } from '@/types/auth'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<void>
  loginWithEmail: (payload: LoginWithEmailPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
}

function setSession(
  set: (state: Partial<AuthState>) => void,
  user: AuthUser,
  accessToken: string,
) {
  localStorage.setItem('access_token', accessToken)
  set({ user, accessToken, isAuthenticated: true })
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: async (payload) => {
        const { user, accessToken } = await authApi.login(payload)
        setSession(set, user, accessToken)
      },

      loginWithEmail: async (payload) => {
        const { user, accessToken } = await authApi.loginWithEmail(payload)
        setSession(set, user, accessToken)
      },

      register: async (payload) => {
        const { user, accessToken } = await authApi.register(payload)
        setSession(set, user, accessToken)
      },

      logout: async () => {
        try {
          await authApi.logout()
        } catch {
          // 即使后端失败也清除本地状态
        }
        localStorage.removeItem('access_token')
        set({ user: null, accessToken: null, isAuthenticated: false })
      },
    }),
    {
      name: 'iyy-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          localStorage.setItem('access_token', state.accessToken)
        }
      },
    },
  ),
)
