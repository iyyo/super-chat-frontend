interface VisualProps {
  theme?: 'light' | 'dark'
}

export function DocVisual({ theme = 'light' }: VisualProps) {
  const paper = theme === 'dark' ? '#2c2c2e' : '#ffffff'
  const line = theme === 'dark' ? '#48484a' : '#d2d2d7'
  const bg = theme === 'dark' ? '#000' : '#fbfbfd'

  return (
    <div className="official-illustration-wrap">
      <svg viewBox="0 0 460 345" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="doc-scan-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0071e3" stopOpacity="0" />
            <stop offset="50%" stopColor="#0071e3" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0071e3" stopOpacity="0" />
          </linearGradient>
          <filter id="doc-shadow">
            <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#000" floodOpacity="0.06" />
          </filter>
          <clipPath id="doc-clip">
            <rect x="128" y="48" width="224" height="260" rx="8" />
          </clipPath>
        </defs>

        <rect width="460" height="345" rx="24" fill={bg} />

        <g filter="url(#doc-shadow)" className="official-svg-float-slow">
          <rect x="118" y="55" width="224" height="260" rx="8" fill={line} opacity="0.3" transform="rotate(-3 230 172)" />
          <rect x="128" y="48" width="224" height="260" rx="8" fill={paper} stroke={line} strokeWidth="1" />

          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect
              key={i}
              x={152}
              y={80 + i * 24}
              width={i % 3 === 2 ? 120 : 168}
              height={5}
              rx={2.5}
              fill={line}
              opacity={0.5 + (i % 2) * 0.15}
            />
          ))}

          <rect x="152" y="200" width="168" height="48" rx="8" fill="#0071e3" opacity="0.08" />
          <rect x="160" y="212" width="140" height="4" rx="2" fill="#0071e3" opacity="0.5" />
          <rect x="160" y="224" width="100" height="4" rx="2" fill="#0071e3" opacity="0.3" />

          <rect
            x="128"
            y="48"
            width="224"
            height="40"
            fill="url(#doc-scan-grad)"
            clipPath="url(#doc-clip)"
            className="official-svg-scan-line"
          />
        </g>

        <g className="official-svg-float">
          <circle cx="340" cy="90" r="28" fill="#0071e3" opacity="0.12" />
          <circle cx="340" cy="90" r="20" fill="#0071e3" />
          <text x="340" y="95" textAnchor="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="PingFang SC, sans-serif">
            AI
          </text>
        </g>
      </svg>
    </div>
  )
}
