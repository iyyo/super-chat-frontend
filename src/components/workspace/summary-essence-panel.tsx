import { Loader2, Sparkles } from 'lucide-react'
import { SummaryBrief } from '@/components/workspace/summary-brief'
import { SummaryMinutes } from '@/components/workspace/summary-minutes'
import { cn } from '@/lib/utils'
import type { StructuredSummaryDocument } from '@/lib/structured-summary-document'

interface SummaryEssencePanelProps {
  document: StructuredSummaryDocument
  generating?: boolean
  templateName?: string | null
  streamStatus?: string | null
  streamDraft?: { title?: string; abstract?: string; bullets?: string[] } | null
  errorMessage?: string | null
  failed?: boolean
  onOpenLibrary?: () => void
  onGenerate?: () => void
}

export function SummaryEssencePanel({
  document: doc,
  generating = false,
  templateName,
  streamStatus,
  streamDraft,
  errorMessage,
  failed = false,
  onOpenLibrary,
  onGenerate,
}: SummaryEssencePanelProps) {
  const hasContent = Boolean(
    doc.abstract ||
      doc.previewBullets?.length ||
      doc.dialogueSections.some(
        (section) => section.paragraphs?.length || section.items?.length || section.bullets?.length,
      ),
  )
  const hasDraft = Boolean(
    streamDraft?.abstract?.trim() ||
      streamDraft?.title?.trim() ||
      (streamDraft?.bullets && streamDraft.bullets.length > 0),
  )
  const templateLabel = templateName?.trim() || '当前模板'

  if (generating && !hasDraft && !hasContent) {
    return (
      <div className="summary-essence-empty" role="status">
        <Loader2 className="summary-essence-spin h-5 w-5 animate-spin" />
        <p className="summary-essence-empty-title">
          {streamStatus?.trim() || `正在按「${templateLabel}」生成…`}
        </p>
        <p className="summary-essence-empty-desc">开始输出后会在这里实时显示</p>
      </div>
    )
  }

  if (generating && hasDraft) {
    return (
      <article className="summary-essence-live" aria-live="polite">
        <div className="summary-essence-live-banner">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{streamStatus?.trim() || `按「${templateLabel}」写出中…`}</span>
        </div>
        {streamDraft?.title ? (
          <h3 className="summary-essence-live-title">{streamDraft.title}</h3>
        ) : null}
        {streamDraft?.abstract ? (
          <p className="summary-essence-live-abstract">
            {streamDraft.abstract}
            <span className="summary-essence-caret" aria-hidden />
          </p>
        ) : (
          <p className="summary-essence-live-abstract is-muted">
            正在提炼摘要…
            <span className="summary-essence-caret" aria-hidden />
          </p>
        )}
        {streamDraft?.bullets && streamDraft.bullets.length > 0 ? (
          <ul className="summary-essence-live-bullets">
            {streamDraft.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </article>
    )
  }

  if (!hasContent) {
    return (
      <div className={cn('summary-essence-empty', failed && 'is-failed')}>
        <p className="summary-essence-empty-title">
          {failed ? '纪要生成失败' : '还没有精华速览'}
        </p>
        <p className="summary-essence-empty-desc">
          {failed
            ? errorMessage?.trim() || '可换模板后重试，或直接再生成一次'
            : `点上方「${templateLabel}」选择模板，再生成结构化纪要；大纲与思维导图会同步更新`}
        </p>
        <div className="summary-essence-empty-actions">
          {onGenerate ? (
            <button type="button" className="summary-essence-btn is-primary" onClick={onGenerate}>
              <Sparkles className="h-3.5 w-3.5" />
              生成纪要
            </button>
          ) : null}
          {onOpenLibrary ? (
            <button type="button" className="summary-essence-btn" onClick={onOpenLibrary}>
              选择模板
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="summary-essence-panel">
      {failed ? (
        <div className="summary-essence-alert" role="alert">
          <span>上次重新生成失败，仍显示旧内容</span>
          {onGenerate ? (
            <button type="button" onClick={onGenerate}>
              重试
            </button>
          ) : null}
        </div>
      ) : null}
      <SummaryBrief abstract={doc.abstract} bullets={doc.previewBullets} />
      <SummaryMinutes title={doc.dialogueTitle} sections={doc.dialogueSections} />
      <p className="file-detail-ai-foot">以上内容由人工智能生成，仅供参考</p>
    </div>
  )
}
