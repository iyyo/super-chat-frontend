import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  ClipboardList,
  Loader2,
  PenLine,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import {
  practiceApi,
  type PracticeAnswer,
  type PracticeAttemptDto,
  type PracticeMistakeDto,
  type PracticeQuestion,
  type PracticeSetDto,
  type PracticeTodayDto,
} from '@/lib/api/practice'
import { isApiClientError } from '@/lib/errors/api-client-error'
import { cn } from '@/lib/utils'
import { toast } from '@/stores/toast-store'

type PracticeTab = 'today' | 'quiz' | 'mistakes'
type QuizPhase = 'list' | 'answering' | 'result'

interface PracticePanelProps {
  fileId: string
  hasContent?: boolean
  onSeek?: (ms: number) => void
}

function errMsg(err: unknown, fallback: string) {
  if (isApiClientError(err)) return err.message || fallback
  if (err instanceof Error) return err.message
  return fallback
}

export function PracticePanel({
  fileId,
  hasContent = true,
  onSeek,
}: PracticePanelProps) {
  const [tab, setTab] = useState<PracticeTab>('today')
  const [today, setToday] = useState<PracticeTodayDto | null>(null)
  const [sets, setSets] = useState<PracticeSetDto[]>([])
  const [mistakes, setMistakes] = useState<PracticeMistakeDto[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [phase, setPhase] = useState<QuizPhase>('list')
  const [attempt, setAttempt] = useState<PracticeAttemptDto | null>(null)
  const [cursor, setCursor] = useState(0)
  const [localAnswers, setLocalAnswers] = useState<PracticeAnswer[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const refreshToday = useCallback(async () => {
    const data = await practiceApi.getToday(fileId)
    setToday(data)
  }, [fileId])

  const refreshSets = useCallback(async () => {
    const data = await practiceApi.listSets(fileId)
    setSets(data)
  }, [fileId])

  const refreshMistakes = useCallback(async () => {
    const data = await practiceApi.listMistakes(fileId)
    setMistakes(data)
  }, [fileId])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([refreshToday(), refreshSets(), refreshMistakes()])
    } catch (err) {
      toast.error(errMsg(err, '加载练习失败'))
    } finally {
      setLoading(false)
    }
  }, [refreshToday, refreshSets, refreshMistakes])

  useEffect(() => {
    void refreshAll()
    return stopPoll
  }, [fileId, refreshAll])

  useEffect(() => {
    const generating = sets.some((s) => s.status === 'generating')
    if (!generating) {
      stopPoll()
      return
    }
    if (pollRef.current) return
    pollRef.current = setInterval(() => {
      void refreshSets().then(() => {
        void refreshToday()
      })
    }, 2500)
    return stopPoll
  }, [sets, refreshSets, refreshToday])

  const questions = attempt?.questions ?? []

  const beginAttempt = async (setId: string) => {
    setBusy(true)
    try {
      const started = await practiceApi.startAttempt(fileId, setId)
      setAttempt(started)
      setLocalAnswers(started.answers ?? [])
      setCursor(0)
      setPhase('answering')
      setTab('quiz')
    } catch (err) {
      toast.error(errMsg(err, '无法开始答题'))
    } finally {
      setBusy(false)
    }
  }

  const resumeAttempt = async (attemptId: string) => {
    setBusy(true)
    try {
      const data = await practiceApi.getAttempt(fileId, attemptId)
      setAttempt(data)
      setLocalAnswers(data.answers ?? [])
      const answered = data.answers?.filter((a) => a.response.length > 0).length ?? 0
      setCursor(Math.min(answered, Math.max(0, (data.questions?.length ?? 1) - 1)))
      setPhase(data.status === 'completed' ? 'result' : 'answering')
      setTab('quiz')
    } catch (err) {
      toast.error(errMsg(err, '无法继续答题'))
    } finally {
      setBusy(false)
    }
  }

  const setResponse = (questionId: string, response: string[], selfMark?: 'correct' | 'wrong' | null) => {
    setLocalAnswers((prev) => {
      const next = prev.filter((a) => a.questionId !== questionId)
      next.push({ questionId, response, correct: null, selfMark: selfMark ?? null })
      return next
    })
  }

  const saveProgress = async () => {
    if (!attempt || attempt.status !== 'in_progress') return
    try {
      const saved = await practiceApi.saveAttempt(fileId, attempt.id, localAnswers)
      setAttempt(saved)
    } catch {
      /* soft fail */
    }
  }

  const submit = async () => {
    if (!attempt) return
    setBusy(true)
    try {
      await practiceApi.saveAttempt(fileId, attempt.id, localAnswers)
      const result = await practiceApi.submitAttempt(fileId, attempt.id)
      setAttempt(result)
      setLocalAnswers(result.answers ?? [])
      setPhase('result')
      await Promise.all([refreshToday(), refreshMistakes(), refreshSets()])
      toast.success('已交卷')
    } catch (err) {
      toast.error(errMsg(err, '交卷失败'))
    } finally {
      setBusy(false)
    }
  }

  const generate = async () => {
    if (!hasContent) {
      toast.error('请先完成转写或生成纪要后再出题')
      return
    }
    setBusy(true)
    try {
      const set = await practiceApi.generateSet(fileId, { count: 8, types: ['single'] })
      setSets((prev) => [set, ...prev.filter((s) => s.id !== set.id)])
      setTab('quiz')
      setPhase('list')
      toast.success('正在出题…')
    } catch (err) {
      toast.error(errMsg(err, '出题失败'))
    } finally {
      setBusy(false)
    }
  }

  const completeTask = async (taskKey: string) => {
    setBusy(true)
    try {
      const data = await practiceApi.completeToday(fileId, taskKey)
      setToday(data)
      toast.success('已标记完成')
    } catch (err) {
      toast.error(errMsg(err, '请先完成练习后再勾选'))
    } finally {
      setBusy(false)
    }
  }

  const masterMistake = async (mistakeId: string) => {
    setBusy(true)
    try {
      await practiceApi.masterMistake(fileId, mistakeId)
      await Promise.all([refreshMistakes(), refreshToday()])
      toast.success('已标记掌握')
    } catch (err) {
      toast.error(errMsg(err, '操作失败'))
    } finally {
      setBusy(false)
    }
  }

  const currentQ: PracticeQuestion | undefined = questions[cursor]
  const currentAns = currentQ
    ? localAnswers.find((a) => a.questionId === currentQ.id)
    : undefined

  return (
    <div className="fd-practice">
      <div className="fd-practice-nav" role="tablist">
        {(
          [
            { id: 'today' as const, label: '今日' },
            { id: 'quiz' as const, label: '出题练' },
            { id: 'mistakes' as const, label: '错题本' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={cn('fd-practice-nav-btn', tab === item.id && 'is-active')}
            onClick={() => {
              setTab(item.id)
              if (item.id === 'quiz' && phase === 'answering') return
              if (item.id !== 'quiz') setPhase('list')
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="fd-practice-body">
        {loading ? (
          <div className="fd-practice-empty">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>加载练习…</p>
          </div>
        ) : null}

        {!loading && tab === 'today' ? (
          <TodayView
            today={today}
            busy={busy}
            onGenerate={() => void generate()}
            onComplete={(key) => void completeTask(key)}
            onGoMistake={() => setTab('mistakes')}
            onGoQuiz={() => {
              setTab('quiz')
              setPhase('list')
            }}
            onResume={(id) => void resumeAttempt(id)}
          />
        ) : null}

        {!loading && tab === 'quiz' && phase === 'list' ? (
          <QuizListView
            sets={sets}
            busy={busy}
            hasContent={hasContent}
            onGenerate={() => void generate()}
            onStart={(id) => void beginAttempt(id)}
            onRefresh={() => void refreshSets()}
          />
        ) : null}

        {!loading && tab === 'quiz' && phase === 'answering' && currentQ ? (
          <QuizAnsweringView
            index={cursor}
            total={questions.length}
            question={currentQ}
            answer={currentAns}
            busy={busy}
            onSeek={onSeek}
            onPick={(response) => setResponse(currentQ.id, response)}
            onPrev={() => {
              void saveProgress()
              setCursor((c) => Math.max(0, c - 1))
            }}
            onNext={() => {
              void saveProgress()
              setCursor((c) => Math.min(questions.length - 1, c + 1))
            }}
            onSubmit={() => void submit()}
            onExit={() => {
              void saveProgress()
              setPhase('list')
              setAttempt(null)
            }}
          />
        ) : null}

        {!loading && tab === 'quiz' && phase === 'result' && attempt ? (
          <QuizResultView
            attempt={attempt}
            onBack={() => {
              setPhase('list')
              setAttempt(null)
              void refreshAll()
            }}
            onMistakes={() => setTab('mistakes')}
          />
        ) : null}

        {!loading && tab === 'mistakes' ? (
          <MistakesView
            mistakes={mistakes}
            busy={busy}
            onMaster={(id) => void masterMistake(id)}
            onSeek={onSeek}
            onGenerate={() => void generate()}
          />
        ) : null}
      </div>
    </div>
  )
}

function TodayView({
  today,
  busy,
  onGenerate,
  onComplete,
  onGoMistake,
  onGoQuiz,
  onResume,
}: {
  today: PracticeTodayDto | null
  busy: boolean
  onGenerate: () => void
  onComplete: (taskKey: string) => void
  onGoMistake: () => void
  onGoQuiz: () => void
  onResume: (attemptId: string) => void
}) {
  if (!today || today.tasks.length === 0) {
    return (
      <div className="fd-practice-empty">
        <ClipboardList className="fd-practice-empty-icon" />
        <p className="fd-practice-empty-title">今日暂无必做项</p>
        <p className="fd-practice-empty-desc">还没有到期错题，也没有未完成练习。</p>
        <button type="button" className="fd-practice-primary" onClick={onGenerate} disabled={busy}>
          <Sparkles className="h-4 w-4" />
          AI 出题开始第一套
        </button>
      </div>
    )
  }

  return (
    <div className="fd-practice-stack">
      <div className="fd-practice-banner">
        <div>
          <p className="fd-practice-banner-title">今日学习提醒</p>
          <p className="fd-practice-banner-desc">基于本文件错题与未完成练习，不是打卡任务</p>
        </div>
        <span className="fd-practice-banner-progress">
          {today.doneCount}/{today.totalRequired}
          {today.allDone ? ' 已完成' : ''}
        </span>
      </div>

      {today.tasks.map((task) => {
        const actionLabel =
          task.type === 'finish_attempt'
            ? '继续练习'
            : task.type === 'optional_new_set'
              ? '去出题'
              : '去重练'
        const secondaryLabel =
          task.type === 'optional_new_set' ? '跳过此项' : '勾选完成'

        return (
          <div key={task.taskKey} className={cn('fd-practice-task', task.done && 'is-done')}>
            <div className="fd-practice-task-main">
              <p className="fd-practice-task-title">
                {task.done ? <Check className="h-4 w-4" /> : null}
                {task.title}
              </p>
              <p className="fd-practice-task-meta">
                {task.required ? '必做' : '建议'}
                {typeof task.payload.wrongCount === 'number'
                  ? ` · 已错 ${task.payload.wrongCount} 次`
                  : ''}
              </p>
            </div>
            <div className="fd-practice-task-actions">
              {!task.done ? (
                <>
                  <button
                    type="button"
                    className="fd-practice-text"
                    disabled={busy}
                    onClick={() => onComplete(task.taskKey)}
                  >
                    {secondaryLabel}
                  </button>
                  <button
                    type="button"
                    className="fd-practice-primary is-compact"
                    disabled={busy}
                    onClick={() => {
                      if (task.type === 'mistake_review') onGoMistake()
                      else if (task.type === 'finish_attempt') {
                        const id = String(task.payload.attemptId ?? '')
                        if (id) onResume(id)
                      } else onGoQuiz()
                    }}
                  >
                    {actionLabel}
                  </button>
                </>
              ) : (
                <span className="fd-practice-done-label">已完成</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function QuizListView({
  sets,
  busy,
  hasContent,
  onGenerate,
  onStart,
  onRefresh,
}: {
  sets: PracticeSetDto[]
  busy: boolean
  hasContent: boolean
  onGenerate: () => void
  onStart: (setId: string) => void
  onRefresh: () => void
}) {
  return (
    <div className="fd-practice-stack">
      <div className="fd-practice-toolbar">
        <p className="fd-practice-section-title">出题练习</p>
        <div className="fd-practice-toolbar-actions">
          <button type="button" className="fd-practice-ghost is-icon" onClick={onRefresh} title="刷新">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="fd-practice-primary is-compact"
            disabled={busy || !hasContent}
            onClick={onGenerate}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
            AI 出题
          </button>
        </div>
      </div>

      {!hasContent ? (
        <p className="fd-practice-hint">请先完成转写或生成纪要后再出题。</p>
      ) : null}

      {sets.length === 0 ? (
        <div className="fd-practice-empty is-inline">
          <p className="fd-practice-empty-title">还没有套题</p>
          <p className="fd-practice-empty-desc">基于本文件内容生成一套巩固题，默认约 8 道单选。</p>
        </div>
      ) : (
        sets.map((set) => (
          <div key={set.id} className="fd-practice-set">
            <div>
              <p className="fd-practice-set-title">{set.title}</p>
              <p className="fd-practice-set-meta">
                {set.status === 'generating'
                  ? '出题中…'
                  : set.status === 'failed'
                    ? set.errorMessage || '出题失败'
                    : set.status === 'ready'
                      ? `${set.questions?.length ?? 0} 题 · 可开始`
                      : set.status}
              </p>
            </div>
            {set.status === 'ready' ? (
              <button
                type="button"
                className="fd-practice-primary is-compact"
                disabled={busy}
                onClick={() => onStart(set.id)}
              >
                开始答题
              </button>
            ) : null}
            {set.status === 'generating' ? (
              <Loader2 className="h-4 w-4 animate-spin fd-practice-spin" />
            ) : null}
            {set.status === 'failed' ? (
              <button type="button" className="fd-practice-ghost" disabled={busy} onClick={onGenerate}>
                重试
              </button>
            ) : null}
          </div>
        ))
      )}
    </div>
  )
}

function QuizAnsweringView({
  index,
  total,
  question,
  answer,
  busy,
  onSeek,
  onPick,
  onPrev,
  onNext,
  onSubmit,
  onExit,
}: {
  index: number
  total: number
  question: PracticeQuestion
  answer?: PracticeAnswer
  busy: boolean
  onSeek?: (ms: number) => void
  onPick: (response: string[]) => void
  onPrev: () => void
  onNext: () => void
  onSubmit: () => void
  onExit: () => void
}) {
  const selected = answer?.response?.[0] ?? null
  return (
    <div className="fd-practice-quiz">
      <div className="fd-practice-quiz-bar">
        <button type="button" className="fd-practice-ghost" onClick={onExit}>
          退出
        </button>
        <span>
          {index + 1} / {total}
        </span>
      </div>
      <p className="fd-practice-stem">{question.stem}</p>
      {question.anchorMs != null && onSeek ? (
        <button
          type="button"
          className="fd-practice-anchor"
          onClick={() => onSeek(question.anchorMs!)}
        >
          定位原文
        </button>
      ) : null}
      <div className="fd-practice-options">
        {(question.options ?? []).map((opt) => (
          <button
            key={opt}
            type="button"
            className={cn('fd-practice-option', selected === opt && 'is-selected')}
            onClick={() => onPick([opt])}
          >
            {opt}
          </button>
        ))}
      </div>
      <div className="fd-practice-quiz-actions">
        <button type="button" className="fd-practice-ghost" disabled={index === 0} onClick={onPrev}>
          上一题
        </button>
        {index < total - 1 ? (
          <button type="button" className="fd-practice-primary" onClick={onNext}>
            下一题
          </button>
        ) : (
          <button type="button" className="fd-practice-primary" disabled={busy} onClick={onSubmit}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            交卷
          </button>
        )}
      </div>
    </div>
  )
}

function QuizResultView({
  attempt,
  onBack,
  onMistakes,
}: {
  attempt: PracticeAttemptDto
  onBack: () => void
  onMistakes: () => void
}) {
  const scorePct = attempt.score != null ? Math.round(attempt.score * 100) : 0
  const wrong =
    attempt.answers?.filter((a) => a.correct === false).length ?? 0
  return (
    <div className="fd-practice-stack">
      <div className="fd-practice-result">
        <p className="fd-practice-result-score">{scorePct}%</p>
        <p className="fd-practice-result-desc">
          客观题正确率 · 错题 {wrong} 道已写入错题本
        </p>
      </div>
      <div className="fd-practice-result-list">
        {(attempt.questions ?? []).map((q) => {
          const a = attempt.answers?.find((x) => x.questionId === q.id)
          return (
            <div key={q.id} className="fd-practice-result-item">
              <p className="fd-practice-stem is-compact">{q.stem}</p>
              <p
                className={cn(
                  'fd-practice-result-mark',
                  a?.correct === true && 'is-ok',
                  a?.correct === false && 'is-bad',
                )}
              >
                {a?.correct === true ? '正确' : a?.correct === false ? '错误' : '未判'}
                {a?.response?.length ? ` · 你的答案：${a.response.join('、')}` : ''}
              </p>
              {a?.correct === false && q.answer?.length ? (
                <p className="fd-practice-hint">参考：{q.answer.join('、')}</p>
              ) : null}
              {q.analysis ? <p className="fd-practice-hint">{q.analysis}</p> : null}
            </div>
          )
        })}
      </div>
      <div className="fd-practice-quiz-actions">
        <button type="button" className="fd-practice-ghost" onClick={onBack}>
          返回套题
        </button>
        {wrong > 0 ? (
          <button type="button" className="fd-practice-primary" onClick={onMistakes}>
            查看错题本
          </button>
        ) : null}
      </div>
    </div>
  )
}

function MistakesView({
  mistakes,
  busy,
  onMaster,
  onSeek,
  onGenerate,
}: {
  mistakes: PracticeMistakeDto[]
  busy: boolean
  onMaster: (id: string) => void
  onSeek?: (ms: number) => void
  onGenerate: () => void
}) {
  const active = mistakes.filter((m) => m.status === 'active')
  const mastered = mistakes.filter((m) => m.status === 'mastered')

  if (mistakes.length === 0) {
    return (
      <div className="fd-practice-empty">
        <p className="fd-practice-empty-title">错题本是空的</p>
        <p className="fd-practice-empty-desc">答错的题目会自动沉淀在这里，方便复习。</p>
        <button type="button" className="fd-practice-primary" onClick={onGenerate} disabled={busy}>
          去出题
        </button>
      </div>
    )
  }

  return (
    <div className="fd-practice-stack">
      <p className="fd-practice-section-title">待复习 {active.length}</p>
      {active.map((m) => (
        <div key={m.id} className="fd-practice-mistake">
          <p className="fd-practice-stem is-compact">{m.questionSnapshot.stem}</p>
          <p className="fd-practice-task-meta">
            已错 {m.wrongCount} 次 · 到期 {new Date(m.dueAt).toLocaleString('zh-CN', { hour12: false })}
          </p>
          {m.questionSnapshot.options?.length ? (
            <ul className="fd-practice-mistake-opts">
              {m.questionSnapshot.options.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          ) : null}
          <p className="fd-practice-hint">参考：{m.questionSnapshot.answer.join('、')}</p>
          {m.questionSnapshot.analysis ? (
            <p className="fd-practice-hint">{m.questionSnapshot.analysis}</p>
          ) : null}
          <div className="fd-practice-task-actions">
            {m.questionSnapshot.anchorMs != null && onSeek ? (
              <button
                type="button"
                className="fd-practice-ghost"
                onClick={() => onSeek(m.questionSnapshot.anchorMs!)}
              >
                定位原文
              </button>
            ) : null}
            <button
              type="button"
              className="fd-practice-primary is-compact"
              disabled={busy}
              onClick={() => onMaster(m.id)}
            >
              已掌握
            </button>
          </div>
        </div>
      ))}
      {mastered.length > 0 ? (
        <>
          <p className="fd-practice-section-title">已掌握 {mastered.length}</p>
          {mastered.slice(0, 8).map((m) => (
            <div key={m.id} className="fd-practice-mistake is-mastered">
              <p className="fd-practice-stem is-compact">{m.questionSnapshot.stem}</p>
            </div>
          ))}
        </>
      ) : null}
    </div>
  )
}
