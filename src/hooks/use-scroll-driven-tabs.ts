import { useCallback, useEffect, useRef, useState } from 'react'

const STICKY_TOP = 72
const STEP_VH = 72

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getStageMetrics(stage: HTMLElement) {
  const rect = stage.getBoundingClientRect()
  const stageTop = window.scrollY + rect.top
  const scrollRange = stage.offsetHeight - (window.innerHeight - STICKY_TOP)
  return { stageTop, scrollRange: Math.max(scrollRange, 1) }
}

function getIndexFromScroll(stage: HTMLElement, itemCount: number) {
  const { stageTop, scrollRange } = getStageMetrics(stage)
  const scrolled = window.scrollY - (stageTop - STICKY_TOP)
  const progress = clamp(scrolled / scrollRange, 0, 1)
  return clamp(Math.floor(progress * itemCount), 0, itemCount - 1)
}

function getScrollTargetForIndex(stage: HTMLElement, index: number, itemCount: number) {
  const { stageTop, scrollRange } = getStageMetrics(stage)
  const progress = (index + 0.12) / itemCount
  return stageTop - STICKY_TOP + progress * scrollRange
}

export function useScrollDrivenTabs(itemCount: number) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const activeIndexRef = useRef(0)
  const programmaticScrollRef = useRef(false)
  const scrollEndTimerRef = useRef<number | null>(null)
  const rafRef = useRef(0)

  const progress = (activeIndex + 1) / itemCount

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (reducedMotion) return

    const syncFromScroll = () => {
      const stage = stageRef.current
      if (!stage || programmaticScrollRef.current) return

      const nextIndex = getIndexFromScroll(stage, itemCount)
      if (nextIndex === activeIndexRef.current) return

      activeIndexRef.current = nextIndex
      setActiveIndex(nextIndex)
    }

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(syncFromScroll)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    syncFromScroll()

    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [reducedMotion, itemCount])

  useEffect(() => {
    return () => {
      if (scrollEndTimerRef.current) window.clearTimeout(scrollEndTimerRef.current)
    }
  }, [])

  const scrollToStep = useCallback((index: number) => {
    const stage = stageRef.current
    if (!stage || reducedMotion) {
      activeIndexRef.current = index
      setActiveIndex(index)
      return
    }

    activeIndexRef.current = index
    setActiveIndex(index)

    programmaticScrollRef.current = true
    window.scrollTo({
      top: getScrollTargetForIndex(stage, index, itemCount),
      behavior: 'smooth',
    })

    if (scrollEndTimerRef.current) window.clearTimeout(scrollEndTimerRef.current)
    scrollEndTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false
    }, 900)
  }, [itemCount, reducedMotion])

  return {
    activeIndex,
    progress,
    stageRef,
    scrollToStep,
    reducedMotion,
    stepVh: STEP_VH,
  }
}
