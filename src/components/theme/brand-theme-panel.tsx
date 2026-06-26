import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { BRAND_THEME_PRESETS, DEFAULT_BRAND_COLOR } from '@/lib/constants'
import { normalizeHex } from '@/lib/theme'
import { useThemeStore } from '@/stores/theme-store'
import { cn } from '@/lib/utils'

interface BrandThemePanelProps {
  className?: string
  variant?: 'official' | 'app'
}

export function BrandThemePanel({ className, variant = 'official' }: BrandThemePanelProps) {
  const brandColor = useThemeStore((s) => s.brandColor)
  const setBrandColor = useThemeStore((s) => s.setBrandColor)
  const resetBrandColor = useThemeStore((s) => s.resetBrandColor)
  const [hexInput, setHexInput] = useState(brandColor)

  useEffect(() => {
    setHexInput(brandColor)
  }, [brandColor])

  const commitHex = (value: string) => {
    setHexInput(value)
    const normalized = normalizeHex(value)
    if (normalized) setBrandColor(normalized)
  }

  const isOfficial = variant === 'official'

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        isOfficial
          ? 'border-[var(--official-card-border)] bg-white shadow-[var(--official-card-shadow)]'
          : 'border-border bg-surface',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={cn(
              'text-sm font-semibold',
              isOfficial ? 'text-[var(--ifly-text)]' : 'text-foreground',
            )}
          >
            主题色
          </p>
          <p
            className={cn(
              'mt-1 text-xs leading-relaxed',
              isOfficial ? 'text-[var(--ifly-text-secondary)]' : 'text-muted',
            )}
          >
            全局品牌色，官网与 App 同步生效
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetBrandColor()
            setHexInput(DEFAULT_BRAND_COLOR)
          }}
          className={cn(
            'flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs transition',
            isOfficial
              ? 'text-[var(--ifly-text-secondary)] hover:bg-[var(--ifly-bg-gray)] hover:text-[var(--ifly-blue)]'
              : 'text-muted hover:bg-surface-hover hover:text-foreground',
          )}
          title="恢复默认"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          默认
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {BRAND_THEME_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-label={preset.label}
            title={preset.label}
            onClick={() => {
              setBrandColor(preset.color)
              setHexInput(preset.color)
            }}
            className={cn(
              'h-8 w-8 rounded-lg border-2 transition-transform hover:scale-105',
              brandColor === preset.color ? 'border-[var(--ifly-text)] scale-105' : 'border-transparent',
            )}
            style={{ background: preset.color }}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <label
          className={cn(
            'relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border',
            isOfficial ? 'border-[var(--official-card-border)]' : 'border-border',
          )}
        >
          <span
            className="absolute inset-0"
            style={{ background: brandColor }}
            aria-hidden="true"
          />
          <input
            type="color"
            value={brandColor}
            onChange={(e) => {
              setBrandColor(e.target.value)
              setHexInput(e.target.value)
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="自定义颜色"
          />
        </label>
        <input
          type="text"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onBlur={() => commitHex(hexInput)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitHex(hexInput)
          }}
          placeholder="#6366f1"
          className={cn(
            'h-10 flex-1 rounded-lg border px-3 text-sm font-mono outline-none transition',
            isOfficial
              ? 'border-[var(--official-card-border)] bg-[var(--ifly-bg-gray)] text-[var(--ifly-text)] focus:border-[var(--ifly-blue)]'
              : 'border-border bg-background text-foreground focus:border-accent',
          )}
        />
      </div>

      <div
        className="mt-4 flex items-center gap-3 rounded-lg p-3"
        style={{ background: 'var(--brand-summary-gradient)' }}
      >
        <div
          className="h-9 w-9 rounded-lg shadow-sm"
          style={{ background: `linear-gradient(135deg, var(--ifly-blue) 0%, var(--brand-soft) 100%)` }}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--ifly-text)]">预览效果</p>
          <p className="text-xs text-[var(--ifly-blue)]">按钮、链接与强调色将使用此配色</p>
        </div>
      </div>
    </div>
  )
}
