import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URL } from '@/lib/constants'
import { ApiClientError } from '@/lib/errors/api-client-error'
import { toast } from '@/stores/toast-store'
import type { ApiError, ApiResponse } from '@/types/api'

const AUTH_SKIP_REFRESH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/login/email',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/share/',
]

type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
  skipToast?: boolean
}

function shouldSkipRefresh(url?: string): boolean {
  if (!url) return true
  return AUTH_SKIP_REFRESH_PATHS.some((path) => url.includes(path))
}

function shouldShowToast(config?: RetryConfig, force = true): boolean {
  if (!force) return false
  return !config?.skipToast
}

function notifyError(message: string, config?: RetryConfig) {
  if (shouldShowToast(config)) {
    toast.error(message)
  }
}

function redirectToLogin() {
  localStorage.removeItem('access_token')
  const path = window.location.pathname
  if (!path.startsWith('/auth') && !path.startsWith('/legal') && !path.startsWith('/share')) {
    toast.warning('登录状态已过期，请重新登录')
    window.location.href = '/auth'
  }
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await http.post<ApiResponse<{ accessToken: string }>>(
      '/auth/refresh',
      {},
      { _retry: true, skipToast: true } as RetryConfig,
    )
    if (data.code === 0 && data.data.accessToken) {
      localStorage.setItem('access_token', data.data.accessToken)
      return data.data.accessToken
    }
  } catch {
    // refresh 失败，交由调用方跳转登录
  }
  return null
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise: Promise<string | null> | null = null

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as RetryConfig | undefined

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !shouldSkipRefresh(original.url)
    ) {
      original._retry = true

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null
        })
      }

      const token = await refreshPromise
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return http(original)
      }

      redirectToLogin()
    }

    const payload = error.response?.data
    const code = payload?.code ?? error.response?.status ?? 90001
    const message = payload?.message ?? error.message ?? '网络不太稳定，请稍后再试'
    notifyError(message, original)
    return Promise.reject(new ApiClientError(code, message))
  },
)

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const { data } = await http.request<ApiResponse<T>>(config)
  if (data.code !== 0) {
    const message = data.message || '请求失败，请稍后再试'
    if (shouldShowToast(config as RetryConfig)) {
      toast.error(message)
    }
    throw new ApiClientError(data.code, message)
  }
  return data.data
}

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'GET', url }),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'POST', url, data: body }),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'PUT', url, data: body }),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'PATCH', url, data: body }),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'DELETE', url }),
}

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipToast?: boolean
  }
}
