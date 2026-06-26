export function HeroVisual() {
  return (
    <div className="official-hero-visual-wrap shadow-2xl shadow-blue-500/10">
      <img
        src="/images/website/hero-ambient.png"
        alt=""
        className="official-hero-ambient"
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#f5f5f7]/20 via-transparent to-[#f5f5f7]/80" />

      <svg
        viewBox="0 0 900 560"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hero-grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0071e3" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#5e5ce6" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="hero-grad-soft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#f5f5f7" stopOpacity="0.85" />
          </linearGradient>
          <filter id="hero-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="18" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="hero-card-clip">
            <rect x="220" y="120" width="460" height="320" rx="28" />
          </clipPath>
        </defs>

        {/* 背景光晕 */}
        <circle cx="450" cy="280" r="180" fill="#0071e3" opacity="0.06" className="official-svg-float-slow" />
        <circle cx="320" cy="200" r="100" fill="#5e5ce6" opacity="0.05" className="official-svg-float" />
        <circle cx="600" cy="360" r="120" fill="#bf5af2" opacity="0.04" className="official-svg-float-slow" />

        {/* 轨道环 */}
        <g className="official-svg-orbit" style={{ transformOrigin: '450px 280px' }}>
          <circle cx="450" cy="280" r="200" fill="none" stroke="#0071e3" strokeWidth="0.5" opacity="0.15" />
          <circle cx="650" cy="280" r="4" fill="#0071e3" opacity="0.5" />
        </g>
        <g className="official-svg-orbit" style={{ transformOrigin: '450px 280px', animationDirection: 'reverse', animationDuration: '32s' }}>
          <circle cx="450" cy="280" r="240" fill="none" stroke="#5e5ce6" strokeWidth="0.5" opacity="0.12" />
          <circle cx="290" cy="280" r="3" fill="#5e5ce6" opacity="0.4" />
        </g>

        {/* 主卡片 */}
        <g className="official-svg-float-slow">
          <rect x="220" y="120" width="460" height="320" rx="28" fill="url(#hero-grad-soft)" opacity="0.92" />
          <rect x="220" y="120" width="460" height="320" rx="28" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />

          {/* 顶部栏 */}
          <rect x="248" y="148" width="120" height="8" rx="4" fill="#d2d2d7" />
          <rect x="248" y="168" width="80" height="6" rx="3" fill="#e8e8ed" />

          {/* 对话气泡 */}
          <g className="official-svg-msg-1">
            <rect x="248" y="200" width="200" height="44" rx="14" fill="#f5f5f7" />
            <rect x="264" y="216" width="140" height="6" rx="3" fill="#d2d2d7" />
            <rect x="264" y="228" width="100" height="6" rx="3" fill="#e8e8ed" />
          </g>
          <g className="official-svg-msg-2">
            <rect x="380" y="260" width="220" height="52" rx="16" fill="url(#hero-grad-blue)" filter="url(#hero-glow)" />
            <rect x="396" y="276" width="160" height="6" rx="3" fill="white" opacity="0.9" />
            <rect x="396" y="288" width="120" height="6" rx="3" fill="white" opacity="0.6" />
          </g>
          <g className="official-svg-msg-3">
            <rect x="248" y="330" width="180" height="40" rx="12" fill="#f5f5f7" />
            <rect x="264" y="344" width="120" height="6" rx="3" fill="#d2d2d7" />
          </g>

          {/* 输入框 */}
          <rect x="248" y="390" width="404" height="44" rx="22" fill="white" stroke="#e8e8ed" strokeWidth="1" />
          <circle cx="276" cy="412" r="3" className="official-svg-typing-dot" fill="#0071e3" />
          <circle cx="288" cy="412" r="3" className="official-svg-typing-dot" fill="#0071e3" />
          <circle cx="300" cy="412" r="3" className="official-svg-typing-dot" fill="#0071e3" />
        </g>

        {/* 中心 AI 核心 */}
        <g className="official-svg-float" filter="url(#hero-glow)">
          <circle cx="450" cy="280" r="36" fill="url(#hero-grad-blue)" opacity="0.15" className="official-svg-pulse-ring" />
          <circle cx="450" cy="280" r="48" fill="none" stroke="#0071e3" strokeWidth="1" opacity="0.2" className="official-svg-pulse-ring" style={{ animationDelay: '1s' }} />
          <circle cx="450" cy="280" r="28" fill="url(#hero-grad-blue)" />
          <path d="M450 262 L458 278 L474 278 L462 288 L466 304 L450 294 L434 304 L438 288 L426 278 L442 278 Z" fill="white" opacity="0.95" />
        </g>
      </svg>
    </div>
  )
}
