import { useId } from 'react'

interface ChatThinkingIndicatorProps {
  /** 文件详情等窄栏：去掉花哨 SVG，只保留轻量文案 */
  compact?: boolean
}

/** 流式回复首包前的等待态 */
export function ChatThinkingIndicator({ compact = false }: ChatThinkingIndicatorProps) {
  const uid = useId().replace(/:/g, '')
  const grad = `think-grad-${uid}`

  if (compact) {
    return (
      <div
        className="workspace-msg-thinking is-compact"
        role="status"
        aria-live="polite"
        aria-label="正在思考"
      >
        <span className="workspace-msg-thinking-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span>正在整理回答…</span>
      </div>
    )
  }

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

        <g transform="translate(20,20)">
          <circle r="13" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" fill="none" />
          <circle r="9.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" fill="none">
            <animate attributeName="r" values="8;10.5;8" dur="2.2s" repeatCount="indefinite" />
            <animate
              attributeName="stroke-opacity"
              values="0.12;0.32;0.12"
              dur="2.2s"
              repeatCount="indefinite"
            />
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

        <text className="workspace-msg-thinking-text" x="46" y="24.5" fill="currentColor">
          正在思考
        </text>

        <g className="workspace-msg-thinking-bars" transform="translate(126,20)">
          <rect x="0" y="-2" width="3.2" height="4" rx="1.6" fill={`url(#${grad})`}>
            <animate attributeName="height" values="4;15;4" dur="1.05s" repeatCount="indefinite" />
            <animate attributeName="y" values="-2;-9.5;-2" dur="1.05s" repeatCount="indefinite" />
          </rect>
          <rect x="9" y="-2" width="3.2" height="4" rx="1.6" fill={`url(#${grad})`}>
            <animate
              attributeName="height"
              values="4;11;4"
              dur="1.05s"
              begin="0.12s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="y"
              values="-2;-7.5;-2"
              dur="1.05s"
              begin="0.12s"
              repeatCount="indefinite"
            />
          </rect>
          <rect x="18" y="-2" width="3.2" height="4" rx="1.6" fill={`url(#${grad})`}>
            <animate
              attributeName="height"
              values="4;17;4"
              dur="1.05s"
              begin="0.24s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="y"
              values="-2;-10.5;-2"
              dur="1.05s"
              begin="0.24s"
              repeatCount="indefinite"
            />
          </rect>
          <rect x="27" y="-2" width="3.2" height="4" rx="1.6" fill={`url(#${grad})`}>
            <animate
              attributeName="height"
              values="4;12;4"
              dur="1.05s"
              begin="0.36s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="y"
              values="-2;-8;-2"
              dur="1.05s"
              begin="0.36s"
              repeatCount="indefinite"
            />
          </rect>
          <rect x="36" y="-2" width="3.2" height="4" rx="1.6" fill={`url(#${grad})`}>
            <animate
              attributeName="height"
              values="4;14;4"
              dur="1.05s"
              begin="0.48s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="y"
              values="-2;-9;-2"
              dur="1.05s"
              begin="0.48s"
              repeatCount="indefinite"
            />
          </rect>
        </g>
      </svg>
    </div>
  )
}
