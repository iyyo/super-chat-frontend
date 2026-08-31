import { create } from 'zustand'
import { aiApi, type LlmProviderDto } from '@/lib/api/ai'

const STORAGE_KEY = 'iyy_llm_preference'

interface StoredPreference {
  provider: string
  model?: string
}

interface LlmPreferenceState {
  providers: LlmProviderDto[]
  defaultProvider: string
  selectedProvider: string
  selectedModel: string | undefined
  loaded: boolean
  fetchProviders: () => Promise<void>
  setSelection: (provider: string, model?: string) => void
  getSelection: () => { provider?: string; model?: string }
}

function loadStored(): StoredPreference | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredPreference) : null
  } catch {
    return null
  }
}

function saveStored(provider: string, model?: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider, model }))
}

function resolveModel(provider: LlmProviderDto, model?: string): string | undefined {
  if (model && provider.models.some((item) => item.id === model)) return model
  if (provider.models.some((item) => item.id === provider.defaultModel)) {
    return provider.defaultModel
  }
  return provider.models[0]?.id
}

export const useLlmPreferenceStore = create<LlmPreferenceState>((set, get) => ({
  providers: [],
  defaultProvider: 'none',
  selectedProvider: '',
  selectedModel: undefined,
  loaded: false,

  fetchProviders: async () => {
    try {
      const data = await aiApi.listProviders()
      const stored = loadStored()
      const fallbackProvider =
        data.providers.find((item) => item.id === stored?.provider)?.id ??
        data.providers.find((item) => item.id === 'deepseek')?.id ??
        data.providers.find((item) => item.id === data.defaultProvider)?.id ??
        data.providers[0]?.id ??
        ''

      const active = data.providers.find((item) => item.id === fallbackProvider)
      const selectedModel = active ? resolveModel(active, stored?.model) : undefined

      if (fallbackProvider) {
        saveStored(fallbackProvider, selectedModel)
      }

      set({
        providers: data.providers,
        defaultProvider: data.defaultProvider,
        selectedProvider: fallbackProvider,
        selectedModel,
        loaded: true,
      })
    } catch {
      set({ loaded: true })
    }
  },

  setSelection: (provider, model) => {
    const active = get().providers.find((item) => item.id === provider)
    const selectedModel = active ? resolveModel(active, model) : model
    saveStored(provider, selectedModel)
    set({ selectedProvider: provider, selectedModel })
  },

  getSelection: () => {
    const { selectedProvider, selectedModel } = get()
    return {
      provider: selectedProvider || undefined,
      model: selectedModel,
    }
  },
}))
