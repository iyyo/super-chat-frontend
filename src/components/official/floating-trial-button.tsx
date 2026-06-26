import { useEffect, useRef, useState, type TransitionEvent } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function FloatingTrialButton() {
  const [shouldShow, setShouldShow] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [vanishing, setVanishing] = useState(false)
  const expandFrameRef = useRef(0)
  const collapseTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const hero = document.querySelector('.ifly-hero')
    const cta = document.querySelector('.official-cta-section')
    if (!hero) return

    let heroPast = false
    let ctaInView = false

    const sync = () => setShouldShow(heroPast && !ctaInView)

    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        heroPast = !entry?.isIntersecting
        sync()
      },
      { threshold: 0, rootMargin: '-72px 0px 0px 0px' },
    )
    heroObserver.observe(hero)

    let ctaObserver: IntersectionObserver | null = null
    if (cta) {
      ctaObserver = new IntersectionObserver(
        ([entry]) => {
          ctaInView = Boolean(entry?.isIntersecting)
          sync()
        },
        { threshold: 0.12 },
      )
      ctaObserver.observe(cta)
    }

    return () => {
      heroObserver.disconnect()
      ctaObserver?.disconnect()
    }
  }, [])

  const beginVanish = () => {
    if (collapseTimerRef.current) window.clearTimeout(collapseTimerRef.current)
    setVanishing(true)
  }

  useEffect(() => {
    if (shouldShow) {
      if (collapseTimerRef.current) {
        window.clearTimeout(collapseTimerRef.current)
        collapseTimerRef.current = null
      }
      setVanishing(false)

      if (!mounted) {
        setMounted(true)
        setExpanded(false)
      }

      cancelAnimationFrame(expandFrameRef.current)
      expandFrameRef.current = requestAnimationFrame(() => {
        expandFrameRef.current = requestAnimationFrame(() => setExpanded(true))
      })
      return
    }

    if (!mounted) return

    setExpanded(false)

    if (!expanded) {
      beginVanish()
      return
    }

    collapseTimerRef.current = window.setTimeout(() => {
      if (!shouldShow && mounted && !expanded) beginVanish()
    }, 520)
  }, [shouldShow, mounted])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(expandFrameRef.current)
      if (collapseTimerRef.current) window.clearTimeout(collapseTimerRef.current)
    }
  }, [])

  const handleTransitionEnd = (event: TransitionEvent<HTMLAnchorElement>) => {
    if (event.propertyName !== 'max-width') return
    if (!shouldShow && mounted && !expanded && !vanishing) {
      beginVanish()
    }
  }

  const handleAnimationEnd = () => {
    if (!vanishing) return
    setMounted(false)
    setExpanded(false)
    setVanishing(false)
  }

  if (!mounted) return null

  return (
    <Link
      to={ROUTES.authRegister}
      className={cn(
        'official-floating-trial',
        expanded && 'is-expanded',
        vanishing && 'is-vanishing',
      )}
      aria-label="免费试用"
      aria-hidden={vanishing}
      tabIndex={vanishing ? -1 : 0}
      onTransitionEnd={handleTransitionEnd}
      onAnimationEnd={handleAnimationEnd}
    >
      <span className="official-floating-trial-icon" aria-hidden="true">
        <Sparkles className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="official-floating-trial-label">免费试用</span>
    </Link>
  )
}
