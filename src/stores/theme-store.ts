import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_BRAND_COLOR } from '@/lib/constants'
import { normalizeHex } from '@/lib/theme'

interface ThemeState {
  brandColor: string
  setBrandColor: (color: string) => void
  resetBrandColor: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      brandColor: DEFAULT_BRAND_COLOR,
      setBrandColor: (color) => {
        const normalized = normalizeHex(color)
        if (normalized) set({ brandColor: normalized })
      },
      resetBrandColor: () => set({ brandColor: DEFAULT_BRAND_COLOR }),
    }),
    { name: 'iyy-theme' },
  ),
)
