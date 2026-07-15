import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
}

interface ToastState {
  toasts: ToastItem[]
  push: (type: ToastType, message: string) => void
  dismiss: (id: string) => void
}

const AUTO_DISMISS_MS = 4200

function createToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push(type, message) {
    const text = message.trim()
    if (!text) return

    const id = createToastId()
    set((state) => ({ toasts: [...state.toasts, { id, type, message: text }] }))

    window.setTimeout(() => {
      get().dismiss(id)
    }, AUTO_DISMISS_MS)
  },

  dismiss(id) {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
}))

export const toast = {
  success: (message: string) => useToastStore.getState().push('success', message),
  error: (message: string) => useToastStore.getState().push('error', message),
  warning: (message: string) => useToastStore.getState().push('warning', message),
  info: (message: string) => useToastStore.getState().push('info', message),
}
