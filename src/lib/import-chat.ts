import type { ChatAttachment } from '@/types/chat'
import type { TranscribeJobDto } from '@/lib/api/transcribe'
import type { WorkspaceFileDto } from '@/lib/api/files'

export interface ChatLaunchState {
  attachments: ChatAttachment[]
  draft?: string
}

export function fileToAttachment(file: WorkspaceFileDto): ChatAttachment {
  return {
    id: file.id,
    title: file.title,
    duration: file.duration,
  }
}

export function jobToAttachment(job: TranscribeJobDto): ChatAttachment | null {
  if (!job.workspaceFileId) return null
  return {
    id: job.workspaceFileId,
    title: job.fileName.replace(/\.[^.]+$/, '') || job.fileName,
    duration: '--:--',
  }
}

export function defaultImportChatDraft() {
  return '请帮我总结这份录音的核心内容'
}
