import { api } from '@/lib/api/client'

export interface LlmProviderDto {
  id: string
  label: string
  defaultModel: string
  models: Array<{ id: string; label: string }>
}

export interface LlmProvidersResponse {
  defaultProvider: string
  providers: LlmProviderDto[]
}

export const aiApi = {
  listProviders: () => api.get<LlmProvidersResponse>('/ai/providers'),
}
