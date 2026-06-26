import Lenis from 'lenis'
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

interface ScrollToOptions {
  offset?: number
  duration?: number
}

interface SmoothScrollContextValue {
  scrollTo: (target: string | number, options?: ScrollToOptions) => void
  scrollY: number
}

const SmoothScrollContext = createContext<SmoothScrollContextValue | null>(null)

const EASE = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: EASE,
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.4,
      syncTouch: true,
    })
    lenisRef.current = lenis

    lenis.on('scroll', ({ scroll }) => setScrollY(scroll))

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  const scrollTo = (target: string | number, options?: ScrollToOptions) => {
    lenisRef.current?.scrollTo(target, {
      offset: options?.offset ?? -48,
      duration: options?.duration ?? 1.8,
      easing: EASE,
    })
  }

  return (
    <SmoothScrollContext.Provider value={{ scrollTo, scrollY }}>
      {children}
    </SmoothScrollContext.Provider>
  )
}

export function useSmoothScroll() {
  const ctx = useContext(SmoothScrollContext)
  if (!ctx) {
    throw new Error('useSmoothScroll must be used within SmoothScrollProvider')
  }
  return ctx
}
