import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Send, User } from 'lucide-react'

interface ChatPanelProps {
  liveFeed?: boolean
}

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text?: string
  todos?: { owner: string; task: string }[]
}

const SUGGESTIONS = ['再精简一点', '发给项目组', '导出 Word'] as const

const SUGGESTION_REPLIES: Record<(typeof SUGGESTIONS)[number], string> = {
  再精简一点: '好，压缩成三条一句话：产品对齐 Q3 路线 · 研发攻克准确率 · 运营出招募文案。',
  发给项目组: '已生成分享链接，项目组 12 人都能看。要我现在 @ 全员吗？',
  '导出 Word': 'Word 版纪要准备好了，含待办和时间线，点一下就能下。',
}

const TODO_REPLIES: Record<string, string> = {
  产品: '@产品 这边：本月底前完成 Q3 路线图评审，并同步销售和客服。',
  研发: '@研发：重点优化多人会议转写准确率，目标从 94% 提到 97%。',
  运营: '@运营：下周三前出内测招募文案，覆盖微信和知乎两个渠道。',
}

const DEFAULT_REPLY = '收到，我基于刚才的会议录音来回答你。还可以点上面的快捷指令，或 @ 某条待办看详情。'

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function randBetween(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

export function ChatPanel({ liveFeed = true }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputDraft, setInputDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [typingAssistant, setTypingAssistant] = useState('')
  const [visibleSuggestions, setVisibleSuggestions] = useState(0)
  const [busy, setBusy] = useState(false)

  const feedRef = useRef<HTMLDivElement>(null)
  const msgIdRef = useRef(0)
  const userTookOverRef = useRef(false)
  const autoTokenRef = useRef(0)

  const scrollDown = useCallback(() => {
    const el = feedRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [])

  const nextId = () => {
    msgIdRef.current += 1
    return msgIdRef.current
  }

  const stopAuto = useCallback(() => {
    userTookOverRef.current = true
    autoTokenRef.current += 1
  }, [])

  const resolveReply = useCallback((text: string) => {
    const trimmed = text.trim()
    if (trimmed in SUGGESTION_REPLIES) {
      return SUGGESTION_REPLIES[trimmed as (typeof SUGGESTIONS)[number]]
    }
    const todoMatch = trimmed.match(/@(\S+)/)
    if (todoMatch && TODO_REPLIES[todoMatch[1]]) {
      return TODO_REPLIES[todoMatch[1]]
    }
    if (trimmed.includes('待办') || trimmed.includes('谁跟')) {
      return '我按负责人拆好了，上面三条分别 @产品 @研发 @运营，点某一条可看详情。'
    }
    if (trimmed.includes('纪要')) {
      return '可以的～这场大概 42 分钟，我帮你揪出三个重点，待办卡片在上方。'
    }
    return DEFAULT_REPLY
  }, [])

  const typeAssistant = useCallback(
    async (text: string) => {
      setTypingAssistant('')
      for (let i = 1; i <= text.length; i += 1) {
        const ch = text[i - 1]
        setTypingAssistant(text.slice(0, i))
        scrollDown()
        const pause =
          ch === '，' || ch === '。' || ch === '～' || ch === '？' || ch === '·'
            ? randBetween(90, 160)
            : randBetween(22, 42)
        await wait(pause)
      }
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text }])
      setTypingAssistant('')
      scrollDown()
    },
    [scrollDown],
  )

  const respondToUser = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || busy) return

      setBusy(true)
      setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: trimmed }])
      setInputDraft('')
      scrollDown()

      setThinking(true)
      await wait(randBetween(650, 1000))
      setThinking(false)

      await typeAssistant(resolveReply(trimmed))

      setVisibleSuggestions(SUGGESTIONS.length)
      setBusy(false)
    },
    [busy, resolveReply, scrollDown, typeAssistant],
  )

  const handleSend = useCallback(() => {
    stopAuto()
    void respondToUser(inputDraft)
  }, [inputDraft, respondToUser, stopAuto])

  const handleSuggestion = useCallback(
    (text: (typeof SUGGESTIONS)[number]) => {
      stopAuto()
      void respondToUser(text)
    },
    [respondToUser, stopAuto],
  )

  const handleTodoClick = useCallback(
    (owner: string) => {
      stopAuto()
      void respondToUser(`展开 @${owner} 的待办`)
    },
    [respondToUser, stopAuto],
  )

  const typeInInput = useCallback(async (text: string, token: number) => {
    setInputDraft('')
    for (let i = 1; i <= text.length; i += 1) {
      if (userTookOverRef.current || token !== autoTokenRef.current) return
      setInputDraft(text.slice(0, i))
      await wait(randBetween(38, 72))
    }
    if (userTookOverRef.current || token !== autoTokenRef.current) return
    await wait(280)
  }, [])

  const pushUser = useCallback((text: string) => {
    setInputDraft('')
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text }])
  }, [])

  const pushTodos = useCallback(
    (todos: { owner: string; task: string }[]) => {
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', todos }])
      scrollDown()
    },
    [scrollDown],
  )

  const showSuggestions = useCallback(async (token: number) => {
    setVisibleSuggestions(0)
    for (let i = 1; i <= SUGGESTIONS.length; i += 1) {
      if (userTookOverRef.current || token !== autoTokenRef.current) return
      setVisibleSuggestions(i)
      await wait(120)
    }
  }, [])

  const runAutoScript = useCallback(
    async (token: number) => {
      if (userTookOverRef.current || token !== autoTokenRef.current) return

      setMessages([])
      setInputDraft('')
      setThinking(false)
      setTypingAssistant('')
      setVisibleSuggestions(0)
      msgIdRef.current = 0

      await wait(500)
      if (userTookOverRef.current || token !== autoTokenRef.current) return

      await typeInInput('刚开完会，能帮我整份纪要吗', token)
      if (userTookOverRef.current || token !== autoTokenRef.current) return
      pushUser('刚开完会，能帮我整份纪要吗')
      scrollDown()
      await wait(350)

      setThinking(true)
      scrollDown()
      await wait(randBetween(750, 1100))
      if (userTookOverRef.current || token !== autoTokenRef.current) return
      setThinking(false)

      await typeAssistant('可以的～这场大概 42 分钟，我帮你揪出三个重点：')
      await wait(200)
      pushTodos([
        { owner: '产品', task: 'Q3 路线图对齐' },
        { owner: '研发', task: '转写准确率再提一档' },
        { owner: '运营', task: '内测招募文案' },
      ])
      await wait(randBetween(900, 1200))
      if (userTookOverRef.current || token !== autoTokenRef.current) return

      await typeInInput('待办谁跟？', token)
      if (userTookOverRef.current || token !== autoTokenRef.current) return
      pushUser('待办谁跟？')
      scrollDown()
      await wait(300)

      setThinking(true)
      scrollDown()
      await wait(randBetween(650, 950))
      if (userTookOverRef.current || token !== autoTokenRef.current) return
      setThinking(false)

      await typeAssistant(
        '我按负责人拆好了，上面三条分别 @产品 @研发 @运营，点某一条可看详情。',
      )
      await showSuggestions(token)
    },
    [pushTodos, pushUser, scrollDown, showSuggestions, typeAssistant, typeInInput],
  )

  useEffect(() => {
    scrollDown()
  }, [messages, thinking, typingAssistant, scrollDown])

  useEffect(() => {
    if (!liveFeed) return

    const token = ++autoTokenRef.current
    let loopTimer: ReturnType<typeof window.setTimeout>
    let cancelled = false

    const loop = async () => {
      if (cancelled || userTookOverRef.current) return
      await runAutoScript(token)
      if (cancelled || userTookOverRef.current) return
      loopTimer = window.setTimeout(loop, 5200)
    }

    loop()

    return () => {
      cancelled = true
      window.clearTimeout(loopTimer)
      autoTokenRef.current += 1
    }
    // 自动演示仅随 liveFeed 开关；避免 runAutoScript 变更时重置用户交互状态
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveFeed])

  const inputDisabled = busy || thinking || Boolean(typingAssistant)

  return (
    <div className="chat-panel">
      <div className="chat-panel-toolbar">
        <div className="flex items-center gap-2">
          <span className="chat-panel-avatar chat-panel-avatar-bot" aria-hidden="true">
            <Bot className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
          <span className="chat-panel-title">AI 助手</span>
          <span className="chat-panel-online" aria-hidden="true" />
        </div>
        <span className="chat-panel-context">已读取刚才的会议录音 · 可点击体验</span>
      </div>

      <div
        ref={feedRef}
        className="chat-panel-feed"
        onPointerDown={stopAuto}
      >
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} onTodoClick={handleTodoClick} />
        ))}

        {thinking && <ThinkingBubble />}

        {typingAssistant && (
          <ChatBubble
            message={{ id: -1, role: 'assistant', text: typingAssistant }}
            typing
          />
        )}
      </div>

      <div className={`chat-panel-suggestions${visibleSuggestions > 0 ? ' is-active' : ''}`}>
        {SUGGESTIONS.map((item, i) => (
          <button
            key={item}
            type="button"
            className={`chat-panel-suggestion${i < visibleSuggestions ? ' is-visible' : ''}`}
            disabled={inputDisabled || i >= visibleSuggestions}
            onClick={() => handleSuggestion(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <form
        className={`chat-panel-input${inputDraft ? ' chat-panel-input-active' : ''}`}
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
        onPointerDown={stopAuto}
      >
        <input
          type="text"
          className="chat-panel-input-field"
          value={inputDraft}
          disabled={inputDisabled}
          placeholder="跟 AI 继续聊，或点上方快捷指令…"
          onChange={(e) => {
            stopAuto()
            setInputDraft(e.target.value)
          }}
          onFocus={stopAuto}
        />
        <button
          type="submit"
          className={`chat-panel-send${inputDraft.trim() ? ' chat-panel-send-ready' : ''}`}
          disabled={inputDisabled || !inputDraft.trim()}
          aria-label="发送"
        >
          <Send className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </form>
    </div>
  )
}

function ThinkingBubble() {
  return (
    <div className="chat-bubble-row chat-bubble-row-assistant chat-bubble-row-thinking">
      <span className="chat-panel-avatar chat-panel-avatar-bot" aria-hidden="true">
        <Bot className="h-3.5 w-3.5" strokeWidth={1.75} />
      </span>
      <div className="chat-bubble chat-bubble-assistant chat-bubble-thinking">
        <span className="chat-thinking-dot" />
        <span className="chat-thinking-dot" />
        <span className="chat-thinking-dot" />
      </div>
    </div>
  )
}

function ChatBubble({
  message,
  typing = false,
  onTodoClick,
}: {
  message: ChatMessage
  typing?: boolean
  onTodoClick?: (owner: string) => void
}) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`chat-bubble-row ${isUser ? 'chat-bubble-row-user' : 'chat-bubble-row-assistant'} chat-bubble-row-in`}
    >
      <span
        className={
          isUser ? 'chat-panel-avatar chat-panel-avatar-user' : 'chat-panel-avatar chat-panel-avatar-bot'
        }
        aria-hidden="true"
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" strokeWidth={1.75} />
        ) : (
          <Bot className="h-3.5 w-3.5" strokeWidth={1.75} />
        )}
      </span>
      <div
        className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}${typing ? ' chat-bubble-typing' : ''}`}
      >
        {message.text && <p className="chat-bubble-text">{message.text}</p>}
        {message.todos && (
          <ul className="chat-bubble-todos">
            {message.todos.map((item) => (
              <li key={`${item.owner}-${item.task}`}>
                <button
                  type="button"
                  className="chat-todo-item"
                  onClick={() => onTodoClick?.(item.owner)}
                >
                  <span className="chat-todo-owner">@{item.owner}</span>
                  <span className="chat-todo-task">{item.task}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {typing && !message.todos && <span className="chat-panel-input-cursor" />}
      </div>
    </div>
  )
}
