import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Mic, Share2, Sparkles } from 'lucide-react'

interface TranscriptionPanelProps {
  size?: 'default' | 'large'
  /** 波形 + 计时器动画 */
  animateWave?: boolean
  /** 转写内容滚动 + 打字机效果 */
  liveFeed?: boolean
}

const WAVE_HEIGHTS = [0.35, 0.55, 0.75, 0.95, 0.6, 0.85, 1, 0.7, 0.5, 0.8, 0.65, 0.45]

const TRANSCRIPT_POOL = [
  { speaker: '发言人 1', text: '今天我们主要讨论一下 Q3 的产品规划方向。' },
  { speaker: '发言人 2', text: '我建议优先推进语音转写能力的优化，尤其是多人会议场景。' },
  { speaker: '发言人 1', text: '另外会议纪要可以自动生成，减少人工整理时间。' },
  { speaker: '发言人 2', text: '那下周我们先做一轮用户调研，收集真实反馈。' },
  { speaker: '发言人 1', text: '好的，我这边会准备访谈提纲和录音设备。' },
  { speaker: '发言人 2', text: '转写准确率这块，目前实测能达到百分之九十八左右。' },
  { speaker: '发言人 1', text: '多人同时发言时，说话人分离效果也还不错。' },
  { speaker: '发言人 2', text: '会后导出 Word 和 PDF 都可以，格式挺整齐的。' },
] as const

const TYPE_MS = 42
const PAUSE_AFTER_LINE_MS = 600
const MAX_HISTORY = 8

interface CompletedLine {
  id: number
  speaker: string
  time: string
  text: string
}

/** 讯飞风格：实时转写界面 mock */
export function TranscriptionPanel({
  size = 'default',
  animateWave = true,
  liveFeed = animateWave,
}: TranscriptionPanelProps) {
  const isLarge = size === 'large'
  const [seconds, setSeconds] = useState(756)
  const [poolIndex, setPoolIndex] = useState(0)
  const [completed, setCompleted] = useState<CompletedLine[]>([])
  const [typingText, setTypingText] = useState('')
  const [lineId, setLineId] = useState(0)
  const [summaryLevel, setSummaryLevel] = useState(0)
  const feedRef = useRef<HTMLDivElement>(null)
  const secondsRef = useRef(seconds)
  secondsRef.current = seconds

  const scrollToBottom = useCallback(() => {
    const el = feedRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [])

  const current = TRANSCRIPT_POOL[poolIndex % TRANSCRIPT_POOL.length]
  const timeStr = formatDuration(seconds)

  // 计时器
  useEffect(() => {
    if (!animateWave && !liveFeed) return
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(t)
  }, [animateWave, liveFeed])

  // 静态模式：展示完整示例
  useEffect(() => {
    if (liveFeed) return
    setCompleted(
      TRANSCRIPT_POOL.slice(0, 3).map((line, i) => ({
        id: i,
        speaker: line.speaker,
        time: formatDuration(756 + i * 27),
        text: line.text,
      })),
    )
    setTypingText('')
    setSummaryLevel(2)
  }, [liveFeed])

  // 打字机 + 滚动续写
  useEffect(() => {
    if (!liveFeed) return

    const full = current.text
    let charIndex = 0
    let pauseTimer: ReturnType<typeof window.setTimeout>
    setTypingText('')

    const typeTimer = window.setInterval(() => {
      charIndex += 1
      setTypingText(full.slice(0, charIndex))
      scrollToBottom()

      if (charIndex >= full.length) {
        window.clearInterval(typeTimer)
        pauseTimer = window.setTimeout(() => {
          const time = formatDuration(secondsRef.current)
          setCompleted((prev) => {
            const next = [
              ...prev,
              {
                id: lineId,
                speaker: current.speaker,
                time,
                text: full,
              },
            ]
            return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next
          })
          setLineId((id) => id + 1)
          setPoolIndex((i) => i + 1)
          setSummaryLevel((lvl) => Math.min(2, lvl + 1))
        }, PAUSE_AFTER_LINE_MS)
      }
    }, TYPE_MS)

    return () => {
      window.clearInterval(typeTimer)
      if (pauseTimer) window.clearTimeout(pauseTimer)
    }
  }, [liveFeed, poolIndex, current.speaker, current.text, lineId, scrollToBottom])

  useEffect(() => {
    if (liveFeed) scrollToBottom()
  }, [completed.length, liveFeed, scrollToBottom])

  return (
    <div
      className={
        isLarge
          ? 'transcription-panel transcription-panel-lg'
          : 'transcription-panel transcription-panel-sm'
      }
    >
      <div className="transcription-toolbar">
        <div className="flex items-center gap-2">
          <span className="ifly-recording-dot" />
          <span className="text-sm font-medium text-[var(--ifly-text)]">实时转写中</span>
          {(animateWave || liveFeed) && <span className="transcription-live-badge">LIVE</span>}
        </div>
        <div className="flex items-center gap-1">
          <ToolbarBtn icon={Share2} label="分享" />
          <ToolbarBtn icon={Download} label="导出" />
        </div>
        <span className="transcription-timer tabular-nums">{timeStr}</span>
      </div>

      <div className="transcription-wavezone">
        <div className="flex h-14 items-center justify-center gap-[4px]">
          {WAVE_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className={animateWave || liveFeed ? 'ifly-wave-bar' : ''}
              style={{
                width: 3,
                height: `${h * 100}%`,
                borderRadius: 999,
                background: 'linear-gradient(180deg, var(--brand-soft) 0%, var(--ifly-blue) 100%)',
                opacity: 0.4 + h * 0.5,
                animationDelay: animateWave || liveFeed ? `${i * 0.07}s` : undefined,
                transform: animateWave || liveFeed ? undefined : `scaleY(${0.4 + h * 0.6})`,
              }}
            />
          ))}
        </div>
        <div className="transcription-wavezone-label">
          <Mic className="h-3 w-3" strokeWidth={2} />
          多人会议 · 智能降噪
        </div>
      </div>

      <div className="transcription-feed-wrap">
        <div className="transcription-feed-mask" aria-hidden="true" />
        <div
          ref={feedRef}
          className={isLarge ? 'transcription-feed transcription-feed-lg' : 'transcription-feed'}
        >
          <div className="transcription-feed-inner space-y-2.5">
            {completed.map((line, i) => (
              <TranscriptLine
                key={line.id}
                speaker={line.speaker}
                time={line.time}
                text={line.text}
                highlight={liveFeed && i === completed.length - 1 && !typingText}
              />
            ))}
            {liveFeed && typingText && (
              <TranscriptLine
                speaker={current.speaker}
                time={formatDuration(seconds)}
                text={typingText}
                typing
              />
            )}
          </div>
        </div>
      </div>

      <div className="transcription-summary">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--ifly-blue)]" strokeWidth={1.75} />
          <p className="text-xs font-semibold text-[var(--ifly-blue)]">AI 会议纪要</p>
          {summaryLevel >= 2 ? (
            <span className="transcription-summary-tag">已生成</span>
          ) : summaryLevel >= 1 ? (
            <span className="transcription-summary-tag transcription-summary-tag-pending">生成中…</span>
          ) : null}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[var(--ifly-text-secondary)]">
          {summaryLevel === 0 && liveFeed && (
            <span className="transcription-summary-placeholder">正在聆听会议内容…</span>
          )}
          {summaryLevel >= 1 && (
            <>
              核心议题：Q3 产品规划
              {summaryLevel >= 2 && ' · 重点优化语音转写 · 推进 AI 自动纪要功能'}
              {summaryLevel === 1 && (
                <span className="transcription-summary-cursor" />
              )}
            </>
          )}
          {!liveFeed && '核心议题：Q3 产品规划 · 重点优化语音转写 · 推进 AI 自动纪要功能'}
        </p>
        {summaryLevel >= 2 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="transcription-chip transcription-chip-in">待办 3 项</span>
            <span className="transcription-chip transcription-chip-in transcription-chip-delay">决策 2 项</span>
            <span className="transcription-chip transcription-chip-muted transcription-chip-in transcription-chip-delay-2">
              发言人 2 人
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function ToolbarBtn({ icon: Icon, label }: { icon: typeof Mic; label: string }) {
  return (
    <button type="button" className="transcription-tool-btn" aria-label={label}>
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
    </button>
  )
}

function TranscriptLine({
  speaker,
  time,
  text,
  highlight = false,
  typing = false,
}: {
  speaker: string
  time: string
  text: string
  highlight?: boolean
  typing?: boolean
}) {
  return (
    <div
      className={`transcript-line ${highlight ? 'transcript-line-highlight' : ''} ${typing ? 'transcript-line-typing' : 'transcript-line-settled'}`}
    >
      <div className="flex items-center gap-2 text-xs">
        <span className="transcript-speaker">{speaker}</span>
        <span className="text-[var(--ifly-text-muted)]">{time}</span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-[var(--ifly-text)]">
        {text}
        {typing && <span className="transcript-cursor" />}
      </p>
    </div>
  )
}

function formatDuration(total: number) {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function VoiceVisual() {
  return (
    <div className="official-illustration-wrap !aspect-auto !max-w-none">
      <TranscriptionPanel animateWave={false} liveFeed />
    </div>
  )
}
