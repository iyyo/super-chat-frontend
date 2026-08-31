import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AUTH_STORAGE_KEY } from '@/lib/constants'
import { authApi } from '@/lib/api/auth'
import type { AuthUser, LoginPayload, LoginWithEmailPayload, RegisterPayload } from '@/types/auth'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  setUser: (user: AuthUser) => void
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

function mergePersistedState(persistedState: unknown, currentState: AuthState): AuthState {
  const persisted =
    typeof persistedState === 'object' && persistedState !== null
      ? (persistedState as Partial<AuthState>)
      : {}
  const accessToken = persisted.accessToken ?? null

  return {
    ...currentState,
    user: persisted.user ?? null,
    accessToken,
    isAuthenticated: Boolean(accessToken),
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setUser: (user) => set({ user }),

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
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      merge: mergePersistedState,
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          localStorage.setItem('access_token', state.accessToken)
        }
      },
    },
  ),
)
