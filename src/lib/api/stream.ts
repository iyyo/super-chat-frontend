import { API_BASE_URL } from '@/lib/constants'
import type { StreamChunk } from '@/types/chat'

export interface StreamOptions {
  signal?: AbortSignal
  onChunk: (chunk: StreamChunk) => void
  onDone?: () => void
  onError?: (error: Error) => void
}

export async function streamRequest(
  path: string,
  body: unknown,
  options: StreamOptions,
): Promise<void> {
  const token = localStorage.getItem('access_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: options.signal,
  })

  if (!response.ok) {
    throw new Error(`Stream request failed: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Response body is not readable')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith(':')) continue

        if (trimmed.startsWith('data: ')) {
          const payload = trimmed.slice(6)
          if (payload === '[DONE]') {
            options.onDone?.()
            return
          }
          try {
            const chunk = JSON.parse(payload) as StreamChunk
            options.onChunk(chunk)
            if (chunk.done) {
              options.onDone?.()
              return
            }
          } catch {
            options.onChunk({ content: payload })
          }
        }
      }
    }
    options.onDone?.()
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    options.onError?.(error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}
