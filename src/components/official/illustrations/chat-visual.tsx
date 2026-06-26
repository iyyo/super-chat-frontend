interface VisualProps {
  theme?: 'light' | 'dark'
}

export function ChatVisual({ theme = 'light' }: VisualProps) {
  const isDark = theme === 'dark'
  const cardBg = isDark ? '#1d1d1f' : '#ffffff'
  const surface = isDark ? '#2c2c2e' : '#f5f5f7'
  const text = isDark ? '#a1a1a6' : '#86868b'
  const border = isDark ? '#3a3a3c' : '#e8e8ed'

  return (
    <div className="official-illustration-wrap">
      <svg viewBox="0 0 460 345" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="chat-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0071e3" />
            <stop offset="100%" stopColor="#5e5ce6" />
          </linearGradient>
          <filter id="chat-shadow">
            <feDropShadow dx="0" dy="12" stdDeviation="20" floodColor="#000" floodOpacity="0.08" />
          </filter>
        </defs>

        <rect width="460" height="345" rx="24" fill={isDark ? '#000' : '#fbfbfd'} />

        {/* 手机框 */}
        <g filter="url(#chat-shadow)" className="official-svg-float-slow">
          <rect x="130" y="40" width="200" height="280" rx="32" fill={cardBg} stroke={border} strokeWidth="1.5" />
          <rect x="190" y="56" width="60" height="6" rx="3" fill={border} />

          <rect x="150" y="80" width="100" height="36" rx="12" fill={surface} className="official-svg-msg-1" />
          <rect x="162" y="92" width="72" height="5" rx="2.5" fill={text} opacity="0.5" />

          <rect x="190" y="124" width="120" height="44" rx="14" fill="url(#chat-grad)" className="official-svg-msg-2" />
          <rect x="202" y="138" width="88" height="5" rx="2.5" fill="white" opacity="0.85" />
          <rect x="202" y="150" width="60" height="5" rx="2.5" fill="white" opacity="0.5" />

          <rect x="150" y="180" width="90" height="32" rx="10" fill={surface} className="official-svg-msg-3" />
          <rect x="162" y="192" width="56" height="5" rx="2.5" fill={text} opacity="0.4" />

          {/* 输入区 */}
          <rect x="150" y="248" width="160" height="36" rx="18" fill={surface} stroke={border} strokeWidth="1" />
          <circle cx="168" cy="266" r="2.5" className="official-svg-typing-dot" fill="#0071e3" />
          <circle cx="178" cy="266" r="2.5" className="official-svg-typing-dot" fill="#0071e3" />
          <circle cx="188" cy="266" r="2.5" className="official-svg-typing-dot" fill="#0071e3" />
          <circle cx="290" cy="266" r="14" fill="url(#chat-grad)" />
          <path d="M286 266 L292 266 L289 262 M292 266 L289 270" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>

        {/* 装饰粒子 */}
        <circle cx="80" cy="120" r="3" fill="#0071e3" opacity="0.3" className="official-svg-float" />
        <circle cx="380" cy="200" r="4" fill="#5e5ce6" opacity="0.25" className="official-svg-float-slow" />
        <circle cx="60" cy="260" r="2" fill="#bf5af2" opacity="0.35" className="official-svg-float" />
      </svg>
    </div>
  )
}
