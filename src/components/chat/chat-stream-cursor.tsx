/** 流式输出时的打字光标（SVG） */
export function ChatStreamCursor() {
  return (
    <svg
      className="workspace-msg-stream-cursor"
      viewBox="0 0 3 16"
      fill="none"
      aria-hidden="true"
    >
      <rect className="workspace-msg-stream-cursor-bar" x="0.5" y="1" width="2" height="14" rx="1" fill="currentColor" />
    </svg>
  )
}
