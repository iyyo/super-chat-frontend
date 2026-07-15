import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { StructuredSummaryPanel } from '@/components/workspace/structured-summary-panel'
import { filesApi } from '@/lib/api/files'
import { buildEditorState, segmentPlainText } from '@/lib/file-editor'
import { ROUTES } from '@/lib/constants'
import { buildStructuredSummaryDocument, resolveStructuredSummaryDocument } from '@/lib/structured-summary-document'
import { buildSpeakerColorMap, getSpeakerColor } from '@/lib/speaker-colors'
import { formatMs } from '@/lib/parse-transcript'
import { cn } from '@/lib/utils'
import '@/styles/share.css'

export function ShareNotePage() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [metaDate, setMetaDate] = useState('')
  const [metaDuration, setMetaDuration] = useState('')
  const [resultText, setResultText] = useState<string | null>(null)
  const [structuredSummary, setStructuredSummary] = useState<
    ReturnType<typeof buildStructuredSummaryDocument> | null
  >(null)
  const [tab, setTab] = useState<'summary' | 'notes'>('summary')
  const [editor, setEditor] = useState<ReturnType<typeof buildEditorState> | null>(null)

  useEffect(() => {
    if (!token) {
      setError('链接无效')
      setLoading(false)
      return
    }

    setLoading(true)
    filesApi
      .getPublicShare(token)
      .then((data) => {
        setTitle(data.title)
        setMetaDate(data.date)
        setMetaDuration(data.duration)
        setResultText(data.resultText)
        setStructuredSummary(data.structuredSummary)
        const state = buildEditorState(data.editorState, [], {
          fileTitle: data.title,
          plainText: data.resultText,
        })
        setEditor(state)
        setError(null)
      })
      .catch(() => {
        setError('分享链接无效或已关闭')
      })
      .finally(() => setLoading(false))
  }, [token])

  const templateSummaryDoc = useMemo(
    () => buildStructuredSummaryDocument(title, editor?.segments ?? [], resultText),
    [title, editor?.segments, resultText],
  )

  const structuredSummaryDoc = useMemo(
    () => resolveStructuredSummaryDocument(structuredSummary, templateSummaryDoc),
    [structuredSummary, templateSummaryDoc],
  )

  const speakerColorMap = useMemo(() => {
    if (!editor?.segments.length) return new Map<string, number>()
    return buildSpeakerColorMap(editor.segments.map((s) => s.speaker))
  }, [editor?.segments])

  if (loading) {
    return (
      <div className="share-page">
        <div className="share-page-status">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>加载中…</span>
        </div>
      </div>
    )
  }

  if (error || !editor) {
    return (
      <div className="share-page">
        <div className="share-page-status share-page-status--error">
          <AlertCircle className="h-6 w-6" />
          <p>{error ?? '无法加载分享内容'}</p>
          <Link to={ROUTES.official} className="share-page-home-link">
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="share-page">
      <header className="share-page-header">
        <div className="share-page-header-inner">
          <Link to={ROUTES.official} className="share-page-brand">
            {import.meta.env.VITE_APP_TITLE ?? 'IYY AI'}
          </Link>
          <span className="share-page-badge">分享笔记</span>
        </div>
      </header>

      <main className="share-page-main">
        <div className="share-page-card">
          <header className="share-page-card-head">
            <div>
              <h1 className="share-page-title">{title}</h1>
              <p className="share-page-meta">
                {metaDate}
                {metaDuration !== '--:--' ? ` · ${metaDuration}` : ''}
              </p>
            </div>
            <div className="share-page-tabs">
              <button
                type="button"
                className={cn('share-page-tab', tab === 'summary' && 'is-active')}
                onClick={() => setTab('summary')}
              >
                纪要
              </button>
              <button
                type="button"
                className={cn('share-page-tab', tab === 'notes' && 'is-active')}
                onClick={() => setTab('notes')}
              >
                笔记
              </button>
            </div>
          </header>

          <div className="share-page-content">
            {tab === 'summary' ? (
              <>
                <StructuredSummaryPanel document={structuredSummaryDoc} />
                <p className="share-page-footnote">以上内容由人工智能生成，仅供参考</p>
              </>
            ) : (
              <div className="share-page-transcript">
                {editor.segments.length > 0 ? (
                  editor.segments.map((seg) => {
                    const color = getSpeakerColor(
                      speakerColorMap.get(seg.speaker.trim() || '说话人1') ?? 0,
                    )
                    const text = segmentPlainText(seg.html)
                    if (!text.trim()) return null
                    return (
                      <article key={seg.id} className="share-page-segment">
                        <div className="share-page-segment-head">
                          <span
                            className="share-page-speaker"
                            style={{ color: color.fg, background: color.bg }}
                          >
                            {seg.speaker}
                          </span>
                          {seg.endMs > 0 && (
                            <time className="share-page-time">
                              {formatMs(seg.beginMs)} – {formatMs(seg.endMs)}
                            </time>
                          )}
                        </div>
                        <p className="share-page-segment-text">{text}</p>
                      </article>
                    )
                  })
                ) : resultText ? (
                  <p className="share-page-fallback-text">{resultText}</p>
                ) : (
                  <p className="share-page-empty">暂无转写内容</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="share-page-footer">
        <p>
          由{' '}
          <Link to={ROUTES.official} className="share-page-footer-link">
            {import.meta.env.VITE_APP_TITLE ?? 'IYY AI'}
          </Link>{' '}
          提供 · 只读分享
        </p>
      </footer>
    </div>
  )
}
