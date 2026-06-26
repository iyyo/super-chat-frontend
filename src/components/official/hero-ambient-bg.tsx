/** Hero 背景：纯 CSS 氛围（渐变 + 波纹 + 网格），不叠 PNG 避免生硬 */
export function HeroAmbientBg() {
  return (
    <div className="hero-ambient" aria-hidden="true">
      <div className="hero-ambient-gradient" />
      <div className="hero-ambient-bloom" />
      <svg className="hero-ambient-waves" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <defs>
          <linearGradient id="hero-wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--ifly-blue)" stopOpacity="0.08" />
            <stop offset="50%" stopColor="var(--brand-soft)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--ifly-blue)" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <path
          className="hero-wave-path hero-wave-path-1"
          fill="url(#hero-wave-grad)"
          d="M0,160 C240,220 480,80 720,140 C960,200 1200,100 1440,160 L1440,320 L0,320 Z"
        />
        <path
          className="hero-wave-path hero-wave-path-2"
          fill="url(#hero-wave-grad)"
          opacity="0.6"
          d="M0,200 C360,260 600,120 900,180 C1100,220 1300,160 1440,200 L1440,320 L0,320 Z"
        />
      </svg>
      <div className="hero-ambient-grid" />
    </div>
  )
}
