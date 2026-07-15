import { create } from 'zustand'
import { useFilesStore } from '@/stores/files-store'
import { getRecordingEngine } from '@/lib/rtasr/recording-engine'
import type { LiveSegment, RecordingMarker, RecordingPhase } from '@/lib/rtasr/recording-engine'
import type { FinishRecordingResult } from '@/lib/api/rtasr'
import type { RecordingRecoverySnapshot } from '@/lib/rtasr/recording-recovery'
import type { AudioInputDevice } from '@/lib/rtasr/audio-capture'

interface RecordingStoreState {
  phase: RecordingPhase
  sessionId: string | null
  title: string
  minimized: boolean
  elapsedMs: number
  chunkOffsetMs: number
  segments: LiveSegment[]
  draftLine: string
  draftRl: number
  speakerAliasMap: Record<number, string>
  markers: RecordingMarker[]
  errorMessage: string | null
  level: number
  domain: string
  deviceId: string | null
  featureIds: string[]
  renewNotice: string | null
  syncFromEngine: () => void
  start: (title?: string) => Promise<void>
  resumeLive: (snapshot: RecordingRecoverySnapshot) => Promise<void>
  pause: () => void
  resume: () => Promise<void>
  minimize: () => void
  expand: () => void
  stopAndSave: () => Promise<FinishRecordingResult | null>
  setTitle: (title: string) => void
  setDomain: (domain: string) => void
  setDeviceId: (deviceId: string | null) => void
  setFeatureIds: (ids: string[]) => void
  renameSpeaker: (rl: number, name: string) => void
  mergeSpeakers: (fromRl: number, toRl: number) => void
  reassignSegment: (segmentId: string, rl: number) => void
  addMarker: (label?: string) => void
  listDevices: () => Promise<AudioInputDevice[]>
  discardRecovery: () => void
}

const engine = getRecordingEngine()

function pullEngineState() {
  const s = engine.getState()
  return {
    phase: s.phase,
    sessionId: s.sessionId,
    title: s.title,
    minimized: s.minimized,
    elapsedMs: s.elapsedMs,
    chunkOffsetMs: s.chunkOffsetMs,
    segments: s.segments,
    draftLine: s.draftLine,
    draftRl: s.draftRl,
    speakerAliasMap: s.speakerAliasMap,
    markers: s.markers,
    errorMessage: s.errorMessage,
    level: s.level,
    domain: s.domain,
    deviceId: s.deviceId,
    featureIds: s.featureIds,
    renewNotice: s.renewNotice,
  }
}

engine.subscribe(() => {
  useRecordingStore.setState(pullEngineState())
})

export const useRecordingStore = create<RecordingStoreState>((set) => ({
  ...pullEngineState(),

  syncFromEngine: () => set(pullEngineState()),

  start: async (title) => {
    await engine.start(title)
    set(pullEngineState())
  },

  resumeLive: async (snapshot) => {
    await engine.resumeLive(snapshot)
    set(pullEngineState())
  },

  pause: () => {
    engine.pause()
    set(pullEngineState())
  },

  resume: async () => {
    await engine.resume()
    set(pullEngineState())
  },

  minimize: () => {
    engine.setMinimized(true)
    set(pullEngineState())
  },

  expand: () => {
    engine.setMinimized(false)
    set(pullEngineState())
  },

  stopAndSave: async () => {
    const result = await engine.stopAndSave()
    set(pullEngineState())
    if (result) void useFilesStore.getState().fetchFiles()
    return result
  },

  setTitle: (title) => {
    engine.setTitle(title)
    set(pullEngineState())
  },

  setDomain: (domain) => {
    engine.setDomain(domain)
    set(pullEngineState())
  },

  setDeviceId: (deviceId) => {
    engine.setDeviceId(deviceId)
    set(pullEngineState())
  },

  setFeatureIds: (ids) => {
    engine.setFeatureIds(ids)
    set(pullEngineState())
  },

  renameSpeaker: (rl, name) => {
    engine.renameSpeaker(rl, name)
    set(pullEngineState())
  },

  mergeSpeakers: (fromRl, toRl) => {
    engine.mergeSpeakers(fromRl, toRl)
    set(pullEngineState())
  },

  reassignSegment: (segmentId, rl) => {
    engine.reassignSegment(segmentId, rl)
    set(pullEngineState())
  },

  addMarker: (label) => {
    engine.addMarker(label)
    set(pullEngineState())
  },

  listDevices: () => engine.listDevices(),

  discardRecovery: () => {
    engine.discardRecovery()
  },
}))

export function useRecordingActive() {
  const phase = useRecordingStore((s) => s.phase)
  return phase === 'recording' || phase === 'paused' || phase === 'connecting'
}
