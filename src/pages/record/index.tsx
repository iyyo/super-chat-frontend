import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bookmark,
  ChevronDown,
  GitMerge,
  Loader2,
  Mic,
  Minimize2,
  Pause,
  Pencil,
  Play,
  Square,
} from 'lucide-react'
import { RecordingEndPreview } from '@/components/workspace/recording-end-preview'
import { RecordingRecoveryModal } from '@/components/workspace/recording-recovery-modal'
import type { FinishRecordingResult } from '@/lib/api/rtasr'
import { rtasrApi, type VoiceprintDto } from '@/lib/api/rtasr'
import { IMPORT_PROFESSIONAL_DOMAINS, ROUTES } from '@/lib/constants'
import { defaultSpeakerLabel } from '@/lib/rtasr/parse-result'
import { loadRecordingRecovery, type RecordingRecoverySnapshot } from '@/lib/rtasr/recording-recovery'
import { RTASR_RENEW_AT_MS } from '@/lib/rtasr/constants'
import { formatMs } from '@/lib/parse-transcript'
import { buildSpeakerColorMap, getSpeakerColor } from '@/lib/speaker-colors'
import { useRecordingStore } from '@/stores/recording-store'
import type { AudioInputDevice } from '@/lib/rtasr/audio-capture'
import { cn } from '@/lib/utils'

export function RecordPage() {
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [endResult, setEndResult] = useState<FinishRecordingResult | null>(null)
  const [editingRl, setEditingRl] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [reassignId, setReassignId] = useState<string | null>(null)
  const [mergeFromRl, setMergeFromRl] = useState<number | null>(null)
  const [devices, setDevices] = useState<AudioInputDevice[]>([])
  const [voiceprints, setVoiceprints] = useState<VoiceprintDto[]>([])
  const [recoverySnapshot, setRecoverySnapshot] = useState<RecordingRecoverySnapshot | null>(null)

  const phase = useRecordingStore((s) => s.phase)
  const title = useRecordingStore((s) => s.title)
  const elapsedMs = useRecordingStore((s) => s.elapsedMs)
  const segments = useRecordingStore((s) => s.segments)
  const draftLine = useRecordingStore((s) => s.draftLine)
  const draftRl = useRecordingStore((s) => s.draftRl)
  const speakerAliasMap = useRecordingStore((s) => s.speakerAliasMap)
  const errorMessage = useRecordingStore((s) => s.errorMessage)
  const level = useRecordingStore((s) => s.level)
  const domain = useRecordingStore((s) => s.domain)
  const deviceId = useRecordingStore((s) => s.deviceId)
  const featureIds = useRecordingStore((s) => s.featureIds)
  const markers = useRecordingStore((s) => s.markers)
  const renewNotice = useRecordingStore((s) => s.renewNotice)
  const chunkOffsetMs = useRecordingStore((s) => s.chunkOffsetMs)

  const start = useRecordingStore((s) => s.start)
  const pause = useRecordingStore((s) => s.pause)
  const resume = useRecordingStore((s) => s.resume)
  const minimize = useRecordingStore((s) => s.minimize)
  const stopAndSave = useRecordingStore((s) => s.stopAndSave)
  const setTitle = useRecordingStore((s) => s.setTitle)
  const setDomain = useRecordingStore((s) => s.setDomain)
  const renameSpeaker = useRecordingStore((s) => s.renameSpeaker)
  const reassignSegment = useRecordingStore((s) => s.reassignSegment)
  const mergeSpeakers = useRecordingStore((s) => s.mergeSpeakers)
  const addMarker = useRecordingStore((s) => s.addMarker)
  const setDeviceId = useRecordingStore((s) => s.setDeviceId)
  const setFeatureIds = useRecordingStore((s) => s.setFeatureIds)
  const resumeLive = useRecordingStore((s) => s.resumeLive)
  const discardRecovery = useRecordingStore((s) => s.discardRecovery)
  const listDevices = useRecordingStore((s) => s.listDevices)
  const expand = useRecordingStore((s) => s.expand)

  useEffect(() => {
    expand()
  }, [expand])

  useEffect(() => {
    if (phase !== 'idle') return
    void listDevices().then(setDevices)
    rtasrApi.listVoiceprints().then(setVoiceprints).catch(() => setVoiceprints([]))

    const local = loadRecordingRecovery()
    if (!local) return
    rtasrApi
      .getLiveSession()
      .then((live) => {
        if (live && live.sessionId === local.sessionId) {
          setRecoverySnapshot(local)
        } else {
          discardRecovery()
        }
      })
      .catch(() => discardRecovery())
  }, [phase, listDevices, discardRecovery])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [segments.length, draftLine])

  const speakerIds = useMemo(() => {
    const ids = new Set<number>()
    segments.forEach((s) => ids.add(s.rl > 0 ? s.rl : 1))
    if (draftLine) ids.add(draftRl > 0 ? draftRl : 1)
    if (ids.size === 0) ids.add(1)
    return [...ids].sort((a, b) => a - b)
  }, [segments, draftLine, draftRl])

  const colorMap = useMemo(
    () => buildSpeakerColorMap(speakerIds.map((id) => speakerAliasMap[id] ?? defaultSpeakerLabel(id))),
    [speakerIds, speakerAliasMap],
  )
  const lastSegment = segments[segments.length - 1]
  const lastSegmentRl = lastSegment && lastSegment.rl > 0 ? lastSegment.rl : 1
  const normalizedDraftRl = draftRl > 0 ? draftRl : 1
  const shouldInlineDraft =
    Boolean(draftLine) &&
    Boolean(lastSegment) &&
    lastSegmentRl === normalizedDraftRl

  const isLive = phase === 'recording' || phase === 'paused' || phase === 'connecting'

  const chunkElapsed = elapsedMs - chunkOffsetMs
  const renewCountdownMs = Math.max(0, RTASR_RENEW_AT_MS - chunkElapsed)
  const showRenewHint = isLive && chunkElapsed > RTASR_RENEW_AT_MS - 15 * 60 * 1000

  const handleStart = () => void start(title)

  const handleEnd = async () => {
    setConfirmEnd(false)
    const result = await stopAndSave()
    if (result) setEndResult(result)
  }

  const handleMinimize = () => {
    if (!isLive) return
    minimize()
    navigate(ROUTES.files)
  }

  const commitRename = (rl: number) => {
    renameSpeaker(rl, editName)
    setEditingRl(null)
  }

  const domainLabel = IMPORT_PROFESSIONAL_DOMAINS.find((d) => d.id === domain)?.label ?? '通用'

  return (
    <div className="record-page">
      <header className="record-page-header">
        <Link to={ROUTES.app} className="record-page-back" aria-label="返回">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <input
          type="text"
          className="record-page-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="录音标题"
          disabled={phase === 'saving'}
        />
        <div className="record-page-timer">
          {phase === 'connecting' || phase === 'requesting' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className={cn('record-page-dot', phase === 'recording' && 'is-live')} />
          )}
          <span>{formatMs(elapsedMs)}</span>
          {showRenewHint && (
            <span className="record-renew-hint">续录 {formatMs(renewCountdownMs)}</span>
          )}
        </div>
      </header>

      {renewNotice && <p className="record-renew-notice">{renewNotice}</p>}

      <div className="record-page-body">
        <section className="record-transcript-panel">
          <div ref={scrollRef} className="record-transcript-scroll">
            {segments.length === 0 && !draftLine && phase === 'idle' && (
              <div className="record-empty">
                <Mic className="record-empty-icon" />
                <p>点击开始，边录边出字</p>
                <span>支持长录音、缩小窗口后继续浏览、录音中修改发言人</span>
              </div>
            )}

            {segments.map((seg, index) => {
              const rl = seg.rl > 0 ? seg.rl : 1
              const color = getSpeakerColor(colorMap.get(seg.speakerDisplay) ?? rl - 1)
              const showInlineDraft = shouldInlineDraft && index === segments.length - 1
              return (
                <article key={seg.id} className="record-segment">
                  <div className="record-segment-head">
                    <button
                      type="button"
                      className="record-speaker-tag"
                      style={{ color: color.fg, background: color.bg }}
                      onClick={() => setReassignId(reassignId === seg.id ? null : seg.id)}
                    >
                      {seg.speakerDisplay}
                    </button>
                    {reassignId === seg.id && (
                      <div className="record-reassign-menu">
                        {speakerIds.map((id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              reassignSegment(seg.id, id)
                              setReassignId(null)
                            }}
                          >
                            {speakerAliasMap[id] ?? defaultSpeakerLabel(id)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="record-segment-text">
                    {seg.text}
                    {showInlineDraft && (
                      <span className="record-segment-draft-inline">{draftLine}</span>
                    )}
                  </p>
                </article>
              )
            })}

            {draftLine && !shouldInlineDraft && (
              <article className="record-segment is-draft">
                <span
                  className="record-speaker-tag"
                  style={{
                    color: getSpeakerColor(colorMap.get(speakerAliasMap[draftRl] ?? defaultSpeakerLabel(draftRl)) ?? draftRl - 1).fg,
                    background: getSpeakerColor(colorMap.get(speakerAliasMap[draftRl] ?? defaultSpeakerLabel(draftRl)) ?? draftRl - 1).bg,
                  }}
                >
                  {speakerAliasMap[draftRl] ?? defaultSpeakerLabel(draftRl)}
                </span>
                <p className="record-segment-text">{draftLine}</p>
              </article>
            )}
            {markers.length > 0 && (
              <div className="record-markers">
                {markers.map((m) => (
                  <span key={m.id} className="record-marker-chip">
                    <Bookmark className="h-3 w-3" />
                    {formatMs(m.atMs)}
                    {m.label ? ` · ${m.label}` : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="record-control-panel">
          <div className="record-level">
            <span>输入电平</span>
            <div className="record-level-bar">
              <div className="record-level-fill" style={{ width: `${Math.min(100, level * 400)}%` }} />
            </div>
          </div>

          <div className="record-control-actions">
            {phase === 'idle' || phase === 'error' ? (
              <button type="button" className="record-primary-btn" onClick={handleStart}>
                <Mic className="h-5 w-5" />
                开始录音
              </button>
            ) : phase === 'requesting' || phase === 'connecting' ? (
              <button type="button" className="record-primary-btn" disabled>
                <Loader2 className="h-5 w-5 animate-spin" />
                连接中…
              </button>
            ) : phase === 'saving' ? (
              <button type="button" className="record-primary-btn" disabled>
                <Loader2 className="h-5 w-5 animate-spin" />
                保存中…
              </button>
            ) : phase === 'paused' ? (
              <button type="button" className="record-primary-btn" onClick={() => void resume()}>
                <Play className="h-5 w-5" />
                继续
              </button>
            ) : (
              <>
                <button type="button" className="record-secondary-btn" onClick={pause} disabled={phase !== 'recording'}>
                  <Pause className="h-5 w-5" />
                  暂停
                </button>
                <button
                  type="button"
                  className="record-secondary-btn"
                  onClick={() => addMarker()}
                  disabled={phase !== 'recording' && phase !== 'paused'}
                  title="标记要点"
                >
                  <Bookmark className="h-4 w-4" />
                  标记
                </button>
              </>
            )}

            {isLive && (
              <button type="button" className="record-danger-btn" onClick={() => setConfirmEnd(true)}>
                <Square className="h-4 w-4" />
                结束并保存
              </button>
            )}
          </div>

          <label className="record-field">
            <span>识别领域</span>
            <div className="record-select-wrap">
              <select
                value={domain}
                disabled={isLive}
                onChange={(e) => setDomain(e.target.value)}
              >
                {IMPORT_PROFESSIONAL_DOMAINS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="record-select-icon" />
            </div>
            <span className="record-field-hint">当前：{domainLabel}</span>
          </label>

          <label className="record-field">
            <span>麦克风</span>
            <div className="record-select-wrap">
              <select
                value={deviceId ?? ''}
                disabled={isLive}
                onChange={(e) => setDeviceId(e.target.value || null)}
              >
                <option value="">系统默认</option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="record-select-icon" />
            </div>
          </label>

          {voiceprints.length > 0 ? (
            <div className="record-voiceprints">
              <h3>声纹识别</h3>
              <ul>
                {voiceprints.map((vp) => (
                  <li key={vp.id}>
                    <label className="record-voiceprint-row">
                      <input
                        type="checkbox"
                        disabled={isLive}
                        checked={featureIds.includes(vp.featureId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFeatureIds([...featureIds, vp.featureId])
                          } else {
                            setFeatureIds(featureIds.filter((id) => id !== vp.featureId))
                          }
                        }}
                      />
                      <span>{vp.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            !isLive && (
              <div className="record-voiceprints">
                <h3>声纹识别</h3>
                <button
                  type="button"
                  className="record-voiceprint-register"
                  onClick={() => {
                    const name = window.prompt('输入说话人名称（将生成 mock 声纹 ID）')
                    if (!name?.trim()) return
                    void rtasrApi.registerVoiceprint(name.trim()).then((vp) => {
                      setVoiceprints((prev) => [vp, ...prev])
                    })
                  }}
                >
                  注册声纹
                </button>
              </div>
            )
          )}

          <div className="record-speakers">
            <h3>发言人</h3>
            <ul>
              {speakerIds.map((rl) => (
                <li key={rl}>
                  {editingRl === rl ? (
                    <input
                      className="record-speaker-edit"
                      value={editName}
                      autoFocus
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => commitRename(rl)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(rl)
                        if (e.key === 'Escape') setEditingRl(null)
                      }}
                    />
                  ) : (
                    <div className="record-speaker-row-wrap">
                      <button
                        type="button"
                        className="record-speaker-row"
                        onClick={() => {
                          setEditingRl(rl)
                          setEditName(speakerAliasMap[rl] ?? defaultSpeakerLabel(rl))
                        }}
                      >
                        <span>{speakerAliasMap[rl] ?? defaultSpeakerLabel(rl)}</span>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {speakerIds.length > 1 && (
                        <button
                          type="button"
                          className="record-merge-btn"
                          title="合并到其他发言人"
                          onClick={() => setMergeFromRl(mergeFromRl === rl ? null : rl)}
                        >
                          <GitMerge className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {mergeFromRl === rl && (
                        <div className="record-reassign-menu">
                          {speakerIds
                            .filter((id) => id !== rl)
                            .map((id) => (
                              <button
                                key={id}
                                type="button"
                                onClick={() => {
                                  mergeSpeakers(rl, id)
                                  setMergeFromRl(null)
                                }}
                              >
                                合并到 {speakerAliasMap[id] ?? defaultSpeakerLabel(id)}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <footer className="record-page-footer">
        <button type="button" className="record-footer-btn" disabled={!isLive} onClick={handleMinimize}>
          <Minimize2 className="h-4 w-4" />
          缩小窗口
        </button>
        {errorMessage && <p className="record-error">{errorMessage}</p>}
      </footer>

      {recoverySnapshot && (
        <RecordingRecoveryModal
          snapshot={recoverySnapshot}
          onResume={() => {
            void resumeLive(recoverySnapshot).then(() => setRecoverySnapshot(null))
          }}
          onDiscard={() => {
            discardRecovery()
            setRecoverySnapshot(null)
          }}
        />
      )}

      {endResult && (
        <div className="record-modal-overlay" role="presentation">
          <div className="record-modal record-modal--wide" role="dialog" aria-modal="true">
            <h2>录音已保存</h2>
            <RecordingEndPreview
              file={endResult.file}
              summaryPreview={endResult.summaryPreview}
              summaryStatus={endResult.summaryStatus}
            />
            <button
              type="button"
              className="record-modal-cancel record-modal-dismiss"
              onClick={() => setEndResult(null)}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {confirmEnd && (
        <div className="record-modal-overlay" role="presentation" onClick={() => setConfirmEnd(false)}>
          <div className="record-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>结束录音</h2>
            <p>将保存「{title}」的转写内容与音频到文件库。</p>
            <div className="record-modal-actions">
              <button type="button" className="record-modal-cancel" onClick={() => setConfirmEnd(false)}>
                取消
              </button>
              <button type="button" className="record-modal-confirm" onClick={() => void handleEnd()}>
                保存到文件库
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
