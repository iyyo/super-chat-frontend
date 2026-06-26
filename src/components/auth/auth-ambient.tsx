/** 认证页左侧品牌区装饰：光斑 + 声波波纹 */
export function AuthBrandAmbient() {
  return (
    <>
      <div className="auth-brand-orb auth-brand-orb-1" aria-hidden="true" />
      <div className="auth-brand-orb auth-brand-orb-2" aria-hidden="true" />
      <svg
        className="auth-brand-waves"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="auth-wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
          </linearGradient>
        </defs>
        <path
          className="auth-wave-path auth-wave-path-1"
          fill="url(#auth-wave-grad)"
          d="M0,160 C240,220 480,80 720,140 C960,200 1200,100 1440,160 L1440,320 L0,320 Z"
        />
        <path
          className="auth-wave-path auth-wave-path-2"
          fill="url(#auth-wave-grad)"
          opacity="0.5"
          d="M0,200 C360,260 600,120 900,180 C1100,220 1300,160 1440,200 L1440,320 L0,320 Z"
        />
      </svg>
    </>
  )
}

/** 认证页右侧表单区氛围背景 */
export function AuthFormAmbient() {
  return <div className="auth-form-ambient" aria-hidden="true" />
}

/** 品牌区装饰性声波条 */
export function AuthBrandWaveform() {
  return (
    <div className="auth-brand-waveform" aria-hidden="true">
      {[32, 48, 28, 56, 36, 44, 24].map((_, i) => (
        <span key={i} className="auth-brand-waveform-bar" />
      ))}
    </div>
  )
}
