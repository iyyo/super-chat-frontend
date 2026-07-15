import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  isTranscribeJobActive,
  transcribeApi,
  type TranscribeJobDto,
} from '@/lib/api/transcribe'
import { useFilesStore } from '@/stores/files-store'

export function useImportJobs(active: boolean) {
  const [importJobs, setImportJobs] = useState<TranscribeJobDto[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const wasActiveRef = useRef(active)

  const refreshJobs = useCallback(async (silent = false) => {
    if (!silent) setJobsLoading(true)
    try {
      setImportJobs(await transcribeApi.listJobs())
    } catch {
      if (!silent) setImportJobs([])
    } finally {
      if (!silent) setJobsLoading(false)
    }
  }, [])

  const hasActiveJobs = useMemo(
    () => importJobs.some(isTranscribeJobActive),
    [importJobs],
  )

  useEffect(() => {
    void refreshJobs()
  }, [refreshJobs])

  useEffect(() => {
    if (active && !wasActiveRef.current) void refreshJobs()
    wasActiveRef.current = active
  }, [active, refreshJobs])

  useEffect(() => {
    if (!active || !hasActiveJobs) return
    const timer = setInterval(() => {
      void refreshJobs(true)
      void useFilesStore.getState().fetchFiles({ silent: true })
    }, 3000)
    return () => clearInterval(timer)
  }, [active, hasActiveJobs, refreshJobs])

  return { importJobs, jobsLoading, refreshJobs }
}
