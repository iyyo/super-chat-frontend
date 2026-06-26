interface VisualProps {
  theme?: 'light' | 'dark'
}

export function ImageVisual({ theme = 'dark' }: VisualProps) {
  const frameBg = theme === 'dark' ? '#1d1d1f' : '#ffffff'
  const border = theme === 'dark' ? '#3a3a3c' : '#e8e8ed'

  return (
    <div className="official-illustration-wrap">
      <svg viewBox="0 0 460 345" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="img-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#30d158" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#0071e3" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#bf5af2" stopOpacity="0.6" />
          </linearGradient>
          <clipPath id="img-canvas-clip">
            <rect x="90" y="50" width="320" height="240" rx="16" />
          </clipPath>
        </defs>

        <rect width="460" height="345" rx="24" fill={theme === 'dark' ? '#000' : '#fbfbfd'} />

        <g className="official-svg-float-slow">
          <rect x="70" y="30" width="360" height="270" rx="24" fill={frameBg} stroke={border} strokeWidth="1" />
          <rect x="90" y="50" width="320" height="240" rx="16" fill="#0a0a0a" />

          {/* Image2 生成样图 */}
          <image
            href="/images/website/art-sample.png"
            x="90"
            y="50"
            width="320"
            height="240"
            clipPath="url(#img-canvas-clip)"
            preserveAspectRatio="xMidYMid cover"
            opacity="0.92"
          />

          {/* 生成中 shimmer */}
          <rect x="90" y="50" width="320" height="240" rx="16" clipPath="url(#img-canvas-clip)" fill="url(#img-grad-1)" opacity="0.15" />
          <rect x="90" y="50" width="80" height="240" fill="white" opacity="0.08" className="official-svg-shimmer" clipPath="url(#img-canvas-clip)" />

          {/* 画笔光标 */}
          <g className="official-svg-float">
            <circle cx="340" cy="200" r="20" fill="#0071e3" opacity="0.2" />
            <path d="M330 210 L350 190 L358 198 L338 218 Z" fill="white" opacity="0.9" />
          </g>

          {/* 提示词标签 */}
          <rect x="110" y="68" width="140" height="28" rx="14" fill="rgba(0,0,0,0.45)" />
          <rect x="122" y="80" width="100" height="4" rx="2" fill="white" opacity="0.7" />
        </g>

        {/* 浮动色块装饰 */}
        <circle cx="50" cy="100" r="24" fill="url(#img-grad-1)" opacity="0.35" className="official-svg-float" />
        <circle cx="400" cy="280" r="18" fill="#bf5af2" opacity="0.25" className="official-svg-float-slow" />
      </svg>
    </div>
  )
}
