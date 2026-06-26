/** Hero 标签：live 指示 + 细线声波，替代块状频谱条 */
export function HeroEyebrow() {
  return (
    <div className="hero-eyebrow">
      <span className="hero-live-pulse" aria-hidden="true">
        <span className="hero-live-dot" />
      </span>
      <svg className="hero-eyebrow-wave" viewBox="0 0 56 14" fill="none" aria-hidden="true">
        <path
          className="hero-eyebrow-wave-path"
          d="M1 7 C5 3 9 11 13 7 S21 3 25 7 S33 11 37 7 S45 3 49 7 S53 11 55 7"
          stroke="url(#hero-eyebrow-grad)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="hero-eyebrow-grad" x1="0" y1="0" x2="56" y2="0">
            <stop stopColor="var(--ifly-blue)" />
            <stop offset="1" stopColor="var(--brand-soft)" />
          </linearGradient>
        </defs>
      </svg>
      <span>智慧办公 AI · 实时语音</span>
    </div>
  )
}
