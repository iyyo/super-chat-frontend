import type { LiveSegment, RecordingMarker } from '@/lib/rtasr/recording-engine'
import {
  RECORDING_RECOVERY_KEY,
  RECORDING_RECOVERY_MAX_AGE_MS,
} from '@/lib/rtasr/constants'

export interface RecordingRecoverySnapshot {
  sessionId: string
  title: string
  domain: string
  deviceId: string | null
  featureIds: string[]
  chunkOffsetMs: number
  chunkIndex: number
  elapsedMs: number
  segments: LiveSegment[]
  speakerAliasMap: Record<number, string>
  segmentOverrides: Record<string, number>
  markers: RecordingMarker[]
  savedAt: number
}

export function saveRecordingRecovery(snapshot: RecordingRecoverySnapshot): void {
  try {
    sessionStorage.setItem(RECORDING_RECOVERY_KEY, JSON.stringify(snapshot))
  } catch {
    // quota exceeded — ignore
  }
}

export function loadRecordingRecovery(): RecordingRecoverySnapshot | null {
  try {
    const raw = sessionStorage.getItem(RECORDING_RECOVERY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RecordingRecoverySnapshot
    if (!parsed.sessionId || !parsed.savedAt) return null
    if (Date.now() - parsed.savedAt > RECORDING_RECOVERY_MAX_AGE_MS) {
      clearRecordingRecovery()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearRecordingRecovery(): void {
  sessionStorage.removeItem(RECORDING_RECOVERY_KEY)
}
