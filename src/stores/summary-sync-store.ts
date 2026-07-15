import { create } from 'zustand'

interface SummarySyncState {
  /** fileId → 版本号，插入全文总结后递增 */
  versions: Record<string, number>
  notifyInserted: (fileId: string) => void
}

export const useSummarySyncStore = create<SummarySyncState>((set) => ({
  versions: {},
  notifyInserted: (fileId) =>
    set((s) => ({
      versions: { ...s.versions, [fileId]: (s.versions[fileId] ?? 0) + 1 },
    })),
}))
