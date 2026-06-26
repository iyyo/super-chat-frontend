import { useEffect, useRef, useState } from 'react'
import { Palette } from 'lucide-react'
import { BrandThemePanel } from '@/components/theme/brand-theme-panel'
import { cn } from '@/lib/utils'

interface BrandThemeTriggerProps {
  variant?: 'official' | 'app'
}

export function BrandThemeTrigger({ variant = 'official' }: BrandThemeTriggerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const isOfficial = variant === 'official'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="主题色设置"
        aria-expanded={open}
        className={cn(
          'flex items-center justify-center rounded-lg transition',
          isOfficial
            ? 'h-9 w-9 text-[var(--ifly-text-secondary)] hover:bg-[var(--ifly-bg-gray)] hover:text-[var(--ifly-blue)]'
            : 'h-9 w-9 text-muted hover:bg-surface-hover hover:text-foreground',
        )}
      >
        <Palette className="h-4 w-4" />
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 z-50 mt-2 w-[min(100vw-2rem,320px)]',
            isOfficial ? 'top-full' : 'bottom-full mb-2',
          )}
        >
          <BrandThemePanel variant={variant} />
        </div>
      )}
    </div>
  )
}
