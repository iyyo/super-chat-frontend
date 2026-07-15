import { useId } from 'react'

/** 流式回复首包前：单一 SVG 动效（轨道粒子 + 波形条 + 文案） */
export function ChatThinkingIndicator() {
  const uid = useId().replace(/:/g, '')
  const grad = `think-grad-${uid}`

  return (
    <div className="workspace-msg-thinking" role="status" aria-live="polite" aria-label="正在思考">
      <svg
        className="workspace-msg-thinking-svg"
        viewBox="0 0 196 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={grad} x1="0" y1="20" x2="196" y2="20" gradientUnits="userSpaceOnUse">
            <stop className="workspace-msg-thinking-grad-a" offset="0%" />
            <stop className="workspace-msg-thinking-grad-b" offset="50%" />
            <stop className="workspace-msg-thinking-grad-c" offset="100%" />
          </linearGradient>
        </defs>

        {/* 轨道思考球 */}
        <g transform="translate(20,20)">
          <circle r="13" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" fill="none" />
          <circle r="9.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" fill="none">
            <animate attributeName="r" values="8;10.5;8" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.12;0.32;0.12" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle r="2.6" fill="currentColor" />
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0"
              to="360"
              dur="2.8s"
              repeatCount="indefinite"
            />
            <circle cx="0" cy="-8.8" r="2" fill="currentColor" fillOpacity="0.9" />
            <circle cx="7.6" cy="4.4" r="1.5" fill="currentColor" fillOpacity="0.55" />
            <circle cx="-7.6" cy="4.4" r="1.5" fill="currentColor" fillOpacity="0.55" />
          </g>
        </g>

        {/* 文案 */}
        <text
          className="workspace-msg-thinking-text"
          x="46"
          y="24.5"
          fill="currentColor"
        >
          正在思考
        </text>

        {/* 波形条 */}
        <g className="workspace-msg-thinking-bars" transform="translate(126,20)">
          <rect x="0" y="-2" width="3.2" height="4" rx="1.6" fill={`url(#${grad})`}>
            <animate attributeName="height" values="4;15;4" dur="1.05s" repeatCount="indefinite" />
            <animate attributeName="y" values="-2;-9.5;-2" dur="1.05s" repeatCount="indefinite" />
          </rect>
          <rect x="9" y="-2" width="3.2" height="4" rx="1.6" fill={`url(#${grad})`}>
            <animate attributeName="height" values="4;11;4" dur="1.05s" begin="0.12s" repeatCount="indefinite" />
            <animate attributeName="y" values="-2;-7.5;-2" dur="1.05s" begin="0.12s" repeatCount="indefinite" />
          </rect>
          <rect x="18" y="-2" width="3.2" height="4" rx="1.6" fill={`url(#${grad})`}>
            <animate attributeName="height" values="4;17;4" dur="1.05s" begin="0.24s" repeatCount="indefinite" />
            <animate attributeName="y" values="-2;-10.5;-2" dur="1.05s" begin="0.24s" repeatCount="indefinite" />
          </rect>
          <rect x="27" y="-2" width="3.2" height="4" rx="1.6" fill={`url(#${grad})`}>
            <animate attributeName="height" values="4;12;4" dur="1.05s" begin="0.36s" repeatCount="indefinite" />
            <animate attributeName="y" values="-2;-8;-2" dur="1.05s" begin="0.36s" repeatCount="indefinite" />
          </rect>
          <rect x="36" y="-2" width="3.2" height="4" rx="1.6" fill={`url(#${grad})`}>
            <animate attributeName="height" values="4;14;4" dur="1.05s" begin="0.48s" repeatCount="indefinite" />
            <animate attributeName="y" values="-2;-9;-2" dur="1.05s" begin="0.48s" repeatCount="indefinite" />
          </rect>
        </g>

        {/* 底部微光扫过 */}
        <rect
          className="workspace-msg-thinking-shimmer"
          x="42"
          y="31"
          width="52"
          height="1.5"
          rx="0.75"
          fill="currentColor"
          fillOpacity="0.2"
        >
          <animate attributeName="x" values="42;96;42" dur="2.6s" repeatCount="indefinite" />
          <animate attributeName="width" values="28;52;28" dur="2.6s" repeatCount="indefinite" />
          <animate attributeName="fill-opacity" values="0.08;0.35;0.08" dur="2.6s" repeatCount="indefinite" />
        </rect>
      </svg>
    </div>
  )
}
