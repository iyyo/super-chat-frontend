import { useEffect, useMemo, useState } from 'react'
import {
  BookMarked,
  Briefcase,
  Check,
  GraduationCap,
  Landmark,
  Loader2,
  Scale,
  Sparkles,
  Star,
  TrendingUp,
  UserRound,
  Video,
  WandSparkles,
  X,
} from 'lucide-react'
import {
  filesApi,
  type SummaryTemplateCard,
  type SummaryTemplatesPayload,
} from '@/lib/api/files'
import { cn } from '@/lib/utils'
import { toast } from '@/stores/toast-store'

const CATEGORY_ICONS: Record<string, typeof Sparkles> = {
  custom: Star,
  general: Sparkles,
  education: GraduationCap,
  workplace: Briefcase,
  finance: Landmark,
  legal: Scale,
  sales: TrendingUp,
  media: Video,
  product: WandSparkles,
  growth: UserRound,
}

interface SummaryTemplateLibraryModalProps {
  open: boolean
  currentTemplateId: string | null
  generating?: boolean
  onClose: () => void
  /** 仅切换模板，不生成 */
  onSelect: (templateId: string) => void
  /** 切换模板并立即生成 */
  onSelectAndGenerate: (templateId: string) => void
}

export function SummaryTemplateLibraryModal({
  open,
  currentTemplateId,
  generating = false,
  onClose,
  onSelect,
  onSelectAndGenerate,
}: SummaryTemplateLibraryModalProps) {
  const [payload, setPayload] = useState<SummaryTemplatesPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState('general')
  const [pickedId, setPickedId] = useState<string | null>(currentTemplateId)

  useEffect(() => {
    if (!open) return
    setPickedId(currentTemplateId)
    setLoading(true)
    setLoadError(null)
    filesApi
      .listSummaryTemplates()
      .then((data) => {
        setPayload(data)
        const current =
          data.templates.find((t) => t.id === (currentTemplateId ?? data.defaultTemplateId)) ??
          data.templates[0]
        setCategoryId(current?.categoryId ?? 'general')
        setPickedId(current?.id ?? currentTemplateId)
      })
      .catch(() => {
        setLoadError('模板库加载失败，请检查网络后重试')
        toast.error('加载模板库失败')
      })
      .finally(() => setLoading(false))
  }, [open, currentTemplateId])

  const currentLabel = useMemo(() => {
    if (!payload) return '—'
    const id = pickedId ?? currentTemplateId
    const hit =
      payload.templates.find((t) => t.id === id) ??
      payload.templates.find((t) => t.id === payload.defaultTemplateId)
    return hit ? `${hit.categoryLabel} / ${hit.title}` : '—'
  }, [currentTemplateId, payload, pickedId])

  const categories = useMemo(() => {
    if (!payload) return []
    return payload.categories.filter((cat) => {
      if (cat.id === 'custom') return true
      return payload.templates.some((t) => t.categoryId === cat.id)
    })
  }, [payload])

  const templates = useMemo(() => {
    if (!payload) return [] as SummaryTemplateCard[]
    if (categoryId === 'custom') return []
    return payload.templates.filter((t) => t.categoryId === categoryId)
  }, [categoryId, payload])

  const picked = payload?.templates.find((t) => t.id === pickedId) ?? null
  const dirty = Boolean(pickedId && pickedId !== currentTemplateId)

  if (!open) return null

  return (
    <div className="summary-tpl-overlay" role="presentation" onClick={onClose}>
      <div
        className="summary-tpl-modal"
        role="dialog"
        aria-modal="true"
        aria-label="模板库"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="summary-tpl-head">
          <div className="summary-tpl-head-main">
            <span className="summary-tpl-head-icon" aria-hidden>
              <BookMarked className="h-4 w-4" />
            </span>
            <div>
              <h2>模板库</h2>
              <p>
                预选：<strong>{currentLabel}</strong>
                <span className="summary-tpl-head-tip"> · 先点卡片预选，再确认</span>
              </p>
            </div>
          </div>
          <button type="button" className="summary-tpl-close" aria-label="关闭" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="summary-tpl-body">
          <aside className="summary-tpl-nav" aria-label="模板分类">
            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.id] ?? Sparkles
              const count =
                cat.id === 'custom'
                  ? 0
                  : (payload?.templates.filter((t) => t.categoryId === cat.id).length ?? 0)
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={cn('summary-tpl-nav-item', categoryId === cat.id && 'is-active')}
                  onClick={() => setCategoryId(cat.id)}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  <span className="summary-tpl-nav-label">{cat.label}</span>
                  {cat.id !== 'custom' ? (
                    <span className="summary-tpl-nav-count">{count}</span>
                  ) : null}
                </button>
              )
            })}
          </aside>

          <div className="summary-tpl-main">
            {loading ? (
              <p className="summary-tpl-loading">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载中…
              </p>
            ) : loadError ? (
              <div className="summary-tpl-empty">
                <p>{loadError}</p>
                <button
                  type="button"
                  className="summary-tpl-retry"
                  onClick={() => {
                    setLoading(true)
                    setLoadError(null)
                    filesApi
                      .listSummaryTemplates()
                      .then((data) => {
                        setPayload(data)
                        setCategoryId(
                          data.templates.find((t) => t.id === currentTemplateId)?.categoryId ??
                            'general',
                        )
                      })
                      .catch(() => setLoadError('模板库加载失败，请检查网络后重试'))
                      .finally(() => setLoading(false))
                  }}
                >
                  重试
                </button>
              </div>
            ) : categoryId === 'custom' ? (
              <div className="summary-tpl-section">
                <h3>自定义模板</h3>
                <button type="button" className="summary-tpl-new-card" disabled>
                  <span aria-hidden>+</span>
                  <strong>新建模板</strong>
                  <em>即将开放</em>
                </button>
              </div>
            ) : (
              <div className="summary-tpl-section">
                <h3>{payload?.categories.find((c) => c.id === categoryId)?.label ?? '模板'}</h3>
                {templates.length > 0 ? (
                  <div className="summary-tpl-grid">
                    {templates.map((tpl) => {
                      const selected = tpl.id === pickedId
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          className={cn(
                            'summary-tpl-card',
                            `is-${tpl.accent}`,
                            selected && 'is-selected',
                          )}
                          onClick={() => setPickedId(tpl.id)}
                        >
                          <div className="summary-tpl-card-banner">
                            <strong>{tpl.title}</strong>
                            {selected ? (
                              <span className="summary-tpl-card-check" aria-label="已预选">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                            ) : null}
                          </div>
                          <p>{tpl.description}</p>
                          <span className="summary-tpl-card-cta">
                            {selected ? '已预选' : '点击预选'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="summary-tpl-empty">该分类暂无内置模板</p>
                )}
              </div>
            )}
          </div>
        </div>

        <footer className="summary-tpl-foot">
          <p className="summary-tpl-foot-hint">
            {picked
              ? dirty
                ? `将切换为「${picked.title}」`
                : `当前已是「${picked.title}」`
              : '请先选择一个模板'}
          </p>
          <div className="summary-tpl-foot-actions">
            <button type="button" className="summary-tpl-btn is-ghost" onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className="summary-tpl-btn"
              disabled={!pickedId || generating}
              onClick={() => {
                if (!pickedId) return
                onSelect(pickedId)
              }}
            >
              只用此模板
            </button>
            <button
              type="button"
              className="summary-tpl-btn is-primary"
              disabled={!pickedId || generating}
              onClick={() => {
                if (!pickedId) return
                onSelectAndGenerate(pickedId)
              }}
            >
              {generating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  生成中…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  选用并生成
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
