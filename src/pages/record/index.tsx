import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { RecordingInterruptModal } from '@/components/workspace/recording-interrupt-modal'
import { RecordProviderSelector } from '@/components/workspace/record-provider-selector'
import { RecordingRecoveryModal } from '@/components/workspace/recording-recovery-modal'
import type { RtAsrInterruptNotice, RtAsrLiveSession } from '@/lib/api/rtasr'
import { rtasrApi, type VoiceprintDto } from '@/lib/api/rtasr'
import { IMPORT_PROFESSIONAL_DOMAINS, ROUTES } from '@/lib/constants'
import { defaultSpeakerLabel } from '@/lib/rtasr/parse-result'
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
  const [editingRl, setEditingRl] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [reassignId, setReassignId] = useState<string | null>(null)
  const [mergeFromRl, setMergeFromRl] = useState<number | null>(null)
  const [devices, setDevices] = useState<AudioInputDevice[]>([])
  const [voiceprints, setVoiceprints] = useState<VoiceprintDto[]>([])
  const [recoveryLive, setRecoveryLive] = useState<RtAsrLiveSession | null>(null)
  const [interruptNotice, setInterruptNotice] = useState<RtAsrInterruptNotice | null>(null)
  const [openSelect, setOpenSelect] = useState<'domain' | 'device' | null>(null)

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
  const provider = useRecordingStore((s) => s.provider)
  const deviceId = useRecordingStore((s) => s.deviceId)
  const featureIds = useRecordingStore((s) => s.featureIds)
  const markers = useRecordingStore((s) => s.markers)
  const renewNotice = useRecordingStore((s) => s.renewNotice)
  const chunkOffsetMs = useRecordingStore((s) => s.chunkOffsetMs)
  const reconnectAttempt = useRecordingStore((s) => s.reconnectAttempt)
  const autoFinishResult = useRecordingStore((s) => s.autoFinishResult)
  const saveQueuePending = useRecordingStore((s) => s.saveQueuePending)

  const start = useRecordingStore((s) => s.start)
  const pause = useRecordingStore((s) => s.pause)
  const resume = useRecordingStore((s) => s.resume)
  const minimize = useRecordingStore((s) => s.minimize)
  const stopAndSave = useRecordingStore((s) => s.stopAndSave)
  const clearAutoFinishResult = useRecordingStore((s) => s.clearAutoFinishResult)
  const setTitle = useRecordingStore((s) => s.setTitle)
  const setDomain = useRecordingStore((s) => s.setDomain)
  const setProvider = useRecordingStore((s) => s.setProvider)
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
    if (phase !== 'idle' && phase !== 'error') return
    void listDevices().then(setDevices)
    rtasrApi.listVoiceprints().then(setVoiceprints).catch(() => setVoiceprints([]))

    void rtasrApi
      .getRecovery()
      .then((state) => {
        setRecoveryLive(state.live)
        setInterruptNotice(state.live ? null : state.interrupt)
      })
      .catch(() => {
        setRecoveryLive(null)
        setInterruptNotice(null)
      })
  }, [phase, listDevices])

  useEffect(() => {
    if (!autoFinishResult) return
    const fileId = autoFinishResult.fileId
    clearAutoFinishResult()
    navigate(ROUTES.fileDetail(fileId))
  }, [autoFinishResult, clearAutoFinishResult, navigate])

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

  const isIdle = phase === 'idle' || phase === 'error'
  const isLive =
    phase === 'recording' ||
    phase === 'reconnecting' ||
    phase === 'paused' ||
    phase === 'connecting'
  const isBusy =
    phase === 'requesting' ||
    phase === 'connecting' ||
    phase === 'saving' ||
    phase === 'reconnecting'

  const chunkElapsed = elapsedMs - chunkOffsetMs
  const renewCountdownMs = Math.max(0, RTASR_RENEW_AT_MS - chunkElapsed)
  const showRenewHint = isLive && chunkElapsed > RTASR_RENEW_AT_MS - 15 * 60 * 1000

  const handleStart = () => void start(title)

  const handleEnd = async () => {
    setConfirmEnd(false)
    const result = await stopAndSave()
    if (result) navigate(ROUTES.fileDetail(result.fileId))
  }

  const handleMinimize = () => {
    if (!isLive) return
    minimize()
    navigate(ROUTES.files)
  }

  const handleBack = () => {
    if (isLive) {
      minimize()
      navigate(ROUTES.files)
      return
    }
    navigate(ROUTES.app)
  }

  const commitRename = (rl: number) => {
    renameSpeaker(rl, editName)
    setEditingRl(null)
  }

  const domainLabel = IMPORT_PROFESSIONAL_DOMAINS.find((d) => d.id === domain)?.label ?? '通用'
  const providerLabel = provider === 'aliyun' ? '阿里云' : '讯飞'
  const deviceLabel =
    devices.find((d) => d.deviceId === deviceId)?.label ?? (deviceId ? '已选设备' : '系统默认')
  const levelPct = Math.min(100, Math.round(level * 400))

  useEffect(() => {
    if (!openSelect) return
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('.record-select-wrap')) return
      setOpenSelect(null)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenSelect(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openSelect])

  const toggleSelect = (panel: 'domain' | 'device') => {
    if (!isIdle) return
    setOpenSelect((prev) => (prev === panel ? null : panel))
  }

  const settingsFields = (
    <>
      <RecordProviderSelector value={provider} disabled={!isIdle} onChange={setProvider} />

      <div className="record-field">
        <span>识别领域</span>
        <div className="record-select-wrap">
          <button
            type="button"
            className={cn('record-select-trigger', openSelect === 'domain' && 'is-open')}
            disabled={!isIdle}
            aria-expanded={openSelect === 'domain'}
            aria-haspopup="listbox"
            onClick={() => toggleSelect('domain')}
          >
            <span className="record-select-value">{domainLabel}</span>
            <ChevronDown className="record-select-icon" />
          </button>
          {openSelect === 'domain' && (
            <div className="record-select-popover record-domain-popover" role="listbox">
              <div className="record-domain-grid">
                {IMPORT_PROFESSIONAL_DOMAINS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    role="option"
                    aria-selected={domain === d.id}
                    className={cn('record-domain-option', domain === d.id && 'is-active')}
                    onClick={() => {
                      setDomain(d.id)
                      setOpenSelect(null)
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="record-field">
        <span>麦克风</span>
        <div className="record-select-wrap">
          <button
            type="button"
            className={cn('record-select-trigger', openSelect === 'device' && 'is-open')}
            disabled={!isIdle}
            aria-expanded={openSelect === 'device'}
            aria-haspopup="listbox"
            onClick={() => toggleSelect('device')}
          >
            <span className="record-select-value" title={deviceLabel}>
              {deviceLabel}
            </span>
            <ChevronDown className="record-select-icon" />
          </button>
          {openSelect === 'device' && (
            <div className="record-select-popover record-device-popover" role="listbox">
              <button
                type="button"
                role="option"
                aria-selected={!deviceId}
                className={cn('record-device-option', !deviceId && 'is-active')}
                onClick={() => {
                  setDeviceId(null)
                  setOpenSelect(null)
                }}
              >
                系统默认
              </button>
              {devices.map((d) => (
                <button
                  key={d.deviceId}
                  type="button"
                  role="option"
                  aria-selected={deviceId === d.deviceId}
                  className={cn('record-device-option', deviceId === d.deviceId && 'is-active')}
                  onClick={() => {
                    setDeviceId(d.deviceId)
                    setOpenSelect(null)
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="record-voiceprints">
        <div className="record-section-head">
          <h3>声纹识别</h3>
          {isIdle && provider === 'xfyun' ? (
            <button
              type="button"
              className="record-link-btn"
              onClick={() => {
                const name = window.prompt('输入说话人名称')
                if (!name?.trim()) return
                void rtasrApi.registerVoiceprint(name.trim()).then((vp) => {
                  setVoiceprints((prev) => [vp, ...prev])
                })
              }}
            >
              注册声纹
            </button>
          ) : null}
        </div>
        {voiceprints.length > 0 ? (
          <ul>
            {voiceprints.map((vp) => (
              <li key={vp.id}>
                <label className="record-voiceprint-row">
                  <input
                    type="checkbox"
                    disabled={!isIdle || provider !== 'xfyun'}
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
        ) : (
          <p className="record-section-empty">
            {provider === 'aliyun' ? '阿里云模式不使用讯飞声纹' : '可选：注册声纹后，录音中自动匹配说话人'}
          </p>
        )}
      </div>
    </>
  )

  return (
    <div className={cn('record-page', isIdle && 'is-setup')}>
      <header className="record-page-header">
        <button type="button" className="record-page-back" aria-label="返回" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <input
          type="text"
          className="record-page-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="给这次录音起个标题"
          disabled={phase === 'saving'}
        />
        <div className="record-page-timer">
          {phase === 'connecting' || phase === 'requesting' || phase === 'reconnecting' ? (
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

      {phase === 'reconnecting' && (
        <p className="record-reconnect-notice">
          网络中断，正在重连转写…（第 {reconnectAttempt} 次）音频仍在本地缓冲，超时将自动保存。
        </p>
      )}
      {renewNotice && <p className="record-renew-notice">{renewNotice}</p>}
      {saveQueuePending && (
        <p className="record-reconnect-notice">正在向服务器重试保存，请保持页面打开…</p>
      )}

      {isIdle ? (
        <div className="record-setup">
          <section className="record-setup-main">
            <div className="record-setup-hero">
              <span className="record-setup-badge">实时转写</span>
              <h1>准备开始录音</h1>
              <p>先确认标题、服务商、领域与麦克风，开始后左侧会实时出字，可随时改发言人、打标记。</p>
            </div>

            <div className="record-setup-summary">
              <div>
                <span>领域</span>
                <strong>{domainLabel}</strong>
              </div>
              <div>
                <span>麦克风</span>
                <strong title={deviceLabel}>{deviceLabel}</strong>
              </div>
              <div>
                <span>服务商</span>
                <strong>{providerLabel}</strong>
              </div>
            </div>

            <div className="record-setup-level">
              <div className="record-setup-level-top">
                <span>输入电平</span>
                <em>{levelPct}%</em>
              </div>
              <div className="record-level-bar is-lg">
                <div className="record-level-fill" style={{ width: `${levelPct}%` }} />
              </div>
              <p className="record-setup-level-hint">开始录音后可在此观察音量；过低时请检查麦克风权限与设备。</p>
            </div>

            <button
              type="button"
              className="record-primary-btn is-xl"
              onClick={handleStart}
              disabled={isBusy}
            >
              <Mic className="h-5 w-5" />
              开始录音
            </button>

            {errorMessage ? <p className="record-error">{errorMessage}</p> : null}
          </section>

          <aside className="record-setup-side">
            <h2>录音设置</h2>
            {settingsFields}
            <div className="record-speakers">
              <h3>发言人</h3>
              <p className="record-section-empty">开始后自动识别，可随时改名或合并</p>
            </div>
          </aside>
        </div>
      ) : (
        <div className="record-page-body">
          <section className="record-transcript-panel">
            <div className="record-transcript-toolbar">
              <div className="record-transcript-heading">
                <span className={cn('record-page-dot', phase === 'recording' && 'is-live')} />
                <span>实时原文</span>
              </div>
              <button
                type="button"
                className="record-footer-btn"
                disabled={!isLive}
                onClick={handleMinimize}
              >
                <Minimize2 className="h-3.5 w-3.5" />
                收起
              </button>
            </div>
            <div ref={scrollRef} className="record-transcript-scroll">
              {segments.length === 0 && !draftLine && (
                <div className="record-empty is-live">
                  <Loader2 className="record-empty-icon animate-spin" />
                  <p>{phase === 'paused' ? '已暂停，继续后将恢复出字' : '正在聆听…'}</p>
                  <span>说出内容后，转写会显示在这里</span>
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
              <div className="record-setup-level-top">
                <span>输入电平</span>
                <em>{levelPct}%</em>
              </div>
              <div className="record-level-bar">
                <div className="record-level-fill" style={{ width: `${levelPct}%` }} />
              </div>
            </div>

            <div className="record-control-actions">
              {phase === 'requesting' || phase === 'connecting' ? (
                <button type="button" className="record-primary-btn" disabled>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  连接中…
                </button>
              ) : phase === 'reconnecting' ? (
                <button type="button" className="record-primary-btn" disabled>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  重连中…
                </button>
              ) : phase === 'saving' ? (
                <button type="button" className="record-primary-btn" disabled>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  保存中…
                </button>
              ) : phase === 'paused' ? (
                <button type="button" className="record-primary-btn" onClick={() => void resume()}>
                  <Play className="h-5 w-5" />
                  继续录音
                </button>
              ) : (
                <div className="record-control-row">
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
                </div>
              )}

              {isLive && (
                <button type="button" className="record-danger-btn" onClick={() => setConfirmEnd(true)}>
                  <Square className="h-4 w-4" />
                  结束并保存
                </button>
              )}
            </div>

            <div className="record-live-meta">
              <div>
                <span>领域</span>
                <strong>{domainLabel}</strong>
              </div>
              <div>
                <span>麦克风</span>
                <strong title={deviceLabel}>{deviceLabel}</strong>
              </div>
            </div>

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

            {errorMessage ? <p className="record-error">{errorMessage}</p> : null}
          </aside>
        </div>
      )}

      {recoveryLive && (
        <RecordingRecoveryModal
          live={recoveryLive}
          onResume={() => {
            void resumeLive(recoveryLive).then(() => setRecoveryLive(null))
          }}
          onDiscard={() => {
            discardRecovery()
            setRecoveryLive(null)
            void rtasrApi.getRecovery().then((state) => setInterruptNotice(state.interrupt))
          }}
        />
      )}

      {!recoveryLive && interruptNotice && (
        <RecordingInterruptModal
          notice={interruptNotice}
          onContinue={() => {
            const base = interruptNotice.title?.replace(/-追录$/, '') || '新录音'
            void rtasrApi.ackInterrupt(interruptNotice.sessionId).catch(() => null)
            setInterruptNotice(null)
            setTitle(`${base}-追录`)
            void start(`${base}-追录`)
          }}
          onDismiss={() => {
            void rtasrApi.ackInterrupt(interruptNotice.sessionId).catch(() => null)
            setInterruptNotice(null)
          }}
          onOpenFile={
            interruptNotice.fileId
              ? () => {
                  void rtasrApi.ackInterrupt(interruptNotice.sessionId).catch(() => null)
                  setInterruptNotice(null)
                  navigate(ROUTES.fileDetail(interruptNotice.fileId!))
                }
              : undefined
          }
        />
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
