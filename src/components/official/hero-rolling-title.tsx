import { useEffect, useState, type CSSProperties } from 'react'
import { HERO_TITLE_CYCLES } from '@/lib/constants'
import { cn } from '@/lib/utils'

const INTERVAL_MS = 3800

interface HeroRollingTitleProps {
  className?: string
}

/** Hero 主标题：定时上下翻滚，切换不同文案 */
export function HeroRollingTitle({ className }: HeroRollingTitleProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % HERO_TITLE_CYCLES.length)
    }, INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [paused])

  return (
    <h1
      className={cn(
        'hero-title-block hero-cycle-title mt-4 text-[36px] font-semibold leading-[1.15] md:text-[44px]',
        className,
      )}
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className="hero-cycle-window"
        style={{ '--cycle-index': index } as CSSProperties}
      >
        <div className="hero-cycle-track">
          {HERO_TITLE_CYCLES.map((item) => (
            <div key={item.primary} className="hero-cycle-slide">
              <span className="hero-cycle-primary hero-title-gradient">{item.primary}</span>
              <span className="hero-cycle-secondary">{item.secondary}</span>
            </div>
          ))}
        </div>
      </div>
    </h1>
  )
}
