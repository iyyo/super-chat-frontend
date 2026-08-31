import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  Crown,
  Info,
  Loader2,
  Mic,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  IMPORT_AUDIO_LANGUAGES,
  IMPORT_PROFESSIONAL_DOMAINS,
  IMPORT_SPEAKER_COUNTS,
  ROUTES,
} from '@/lib/constants'
import { defaultImportChatDraft, jobToAttachment, type ChatLaunchState } from '@/lib/import-chat'
import { useImportJob, useImportTaskStore, MAX_BATCH_FILES } from '@/stores/import-task-store'
import { BatchImportProgress } from '@/components/workspace/batch-import-progress'
import {
  ImportSourcePicker,
  type ImportSourceType,
} from '@/components/workspace/import-source-picker'
import { cn } from '@/lib/utils'
import type { ImportMode } from '@/lib/import-task-runner'

interface ImportMediaModalProps {
  open: boolean
  onClose: () => void
}

type ImportPanel = 'speaker' | 'domain' | null

export function ImportMediaModal({ open, onClose }: ImportMediaModalProps) {
  const navigate = useNavigate()
  const { setRecordsOpen, fetchJobHistory, setModalOpen } = useImportTaskStore()
  const titleId = useId()
  const overlayRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [importMode, setImportMode] = useState<ImportMode>('separate')
  const [sourceType, setSourceType] = useState<ImportSourceType>('file')
  const [audioUrl, setAudioUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [language, setLanguage] = useState('zh-en')
  const [dragOver, setDragOver] = useState(false)
  const [speakerCount, setSpeakerCount] = useState('auto')
  const [domain, setDomain] = useState('general')
  const [openPanel, setOpenPanel] = useState<ImportPanel>(null)
  const [hotwordsExpanded, setHotwordsExpanded] = useState(false)
  const [hotwordDraft, setHotwordDraft] = useState('')
  const [hotwords, setHotwords] = useState<string[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const {
    phase,
    session,
    job,
    errorMessage,
    uploadProgress,
    fileName,
    startImport,
    startBatchImport,
    startUrlImport,
    resumeUpload,
    retryTranscribe,
    reset,
    minimize,
    maxFileSize,
    maxBatchFiles,
    storedManifest,
    batchTotal,
    batchSucceeded,
    batchFailed,
    batchItems,
    mergedFileId,
  } = useImportJob()

  const settingsLocked = phase !== 'idle' && phase !== 'error'

  const speakerLabel =
    IMPORT_SPEAKER_COUNTS.find((item) => item.id === speakerCount)?.label ?? '自动'
  const domainLabel =
    IMPORT_PROFESSIONAL_DOMAINS.find((item) => item.id === domain)?.label ?? '通用'

  useEffect(() => {
    if (!open) {
      setDragOver(false)
      setOpenPanel(null)
      setHotwordsExpanded(false)
      setHotwordDraft('')
      setFileError(null)
      setUrlError(null)
      return
    }

    void fetchJobHistory()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (openPanel) setOpenPanel(null)
        else onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose, openPanel, fetchJobHistory])

  useEffect(() => {
    if (!openPanel) return

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('.import-setting-row-wrap')) return
      setOpenPanel(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [openPanel])

  if (!open) return null

  const pickFiles = (incoming: FileList | File[] | null) => {
    if (!incoming || settingsLocked) return
    const arr = Array.from(incoming)
    const oversize: string[] = []
    setSelectedFiles((prev) => {
      const merged = [...prev]
      for (const file of arr) {
        if (merged.length >= maxBatchFiles) break
        if (file.size > maxFileSize) {
          oversize.push(file.name)
          continue
        }
        if (merged.some((f) => f.name === file.name && f.size === file.size)) continue
        merged.push(file)
      }
      return merged
    })
    if (oversize.length > 0) {
      setFileError(`${oversize[0]} 超过 500MB 上限，已跳过`)
    } else {
      setFileError(null)
    }
  }

  const removeFile = (index: number) => {
    if (settingsLocked) return
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setFileError(null)
  }

  const activeFile =
    selectedFiles.find((f) => f.name === storedManifest?.fileName) ?? selectedFiles[0] ?? null

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleSubmit = () => {
    const settings = { language, domain, speakerCount, hotwords }
    if (sourceType === 'url') {
      const value = audioUrl.trim()
      try {
        const parsed = new URL(value)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error()
      } catch {
        setUrlError('请输入有效的 HTTP(S) 音频链接')
        return
      }
      setUrlError(null)
      void startUrlImport(value, settings)
      return
    }
    if (selectedFiles.length === 0 || fileError) return
    if (selectedFiles.length === 1) {
      void startImport(selectedFiles[0]!, settings)
    } else {
      void startBatchImport(selectedFiles, settings, importMode)
    }
  }

  const resetImportForm = () => {
    reset()
    setSelectedFiles([])
    setImportMode('separate')
    setSourceType('file')
    setAudioUrl('')
    setUrlError(null)
    setLanguage('zh-en')
    setSpeakerCount('auto')
    setDomain('general')
    setHotwords([])
  }

  const handleClose = () => {
    if (phase === 'uploading' || phase === 'upload_paused' || phase === 'transcribing') {
      if (!window.confirm('任务将在后台继续，确定关闭弹窗吗？')) return
      minimize()
      onClose()
      return
    }
    onClose()
  }

  const renderLeftPanel = () => {
    if (batchTotal > 1 && batchItems.length > 0 && phase !== 'success') {
      return (
        <BatchImportProgress
          items={batchItems}
          overallProgress={uploadProgress}
          succeeded={batchSucceeded}
          failed={batchFailed}
        />
      )
    }

    if (phase === 'uploading' || phase === 'upload_paused') {
      const uploaded = session?.uploadedChunks.length ?? 0
      const total = session?.totalChunks ?? 0
      return (
        <div className="import-progress-panel">
          <p className="import-progress-filename">
            {fileName ?? '文件'}
          </p>
          <p className="import-progress-meta">
            {session ? formatSize(session.fileSize) : ''} · 分片 {uploaded}/{total}
          </p>
          <div className="import-progress-bar-wrap">
            <div
              className={cn(
                'import-progress-bar',
                phase === 'upload_paused' && 'is-paused',
              )}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="import-progress-percent">{uploadProgress}%</p>
          {phase === 'upload_paused' ? (
            <div className="import-progress-alert">
              <AlertTriangle className="h-4 w-4" />
              <span>{errorMessage}</span>
              <button
                type="button"
                className="import-progress-retry"
                onClick={() => activeFile && void resumeUpload(activeFile)}
              >
                立即重试
              </button>
            </div>
          ) : (
            <p className="import-progress-hint">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在上传…支持断点续传
            </p>
          )}
        </div>
      )
    }

    if (phase === 'transcribing') {
      const isUrlImport = job?.sourceType === 'url' || sourceType === 'url'
      const preparingMedia = job?.status === 'queued' || job?.status === 'uploading_to_xfyun'
      return (
        <div className="import-progress-panel">
          <p className="import-progress-filename">
            {fileName ?? '文件'}
          </p>
          <p className="import-progress-meta">{isUrlImport ? '公开音频链接' : '✓ 上传完成'}</p>
          <div className="import-progress-bar-wrap">
            <div className="import-progress-bar is-done" style={{ width: '100%' }} />
          </div>
          <p className="import-progress-hint is-transcribing">
            <Loader2 className="h-5 w-5 animate-spin" />
            {isUrlImport && !job
              ? '正在校验音频链接…'
              : preparingMedia
                ? isUrlImport
                  ? '正在提交讯飞转写…'
                  : '正在处理音轨并提交转写…'
                : 'IFASR 大模型转写中…'}
          </p>
          <ul className="import-pipeline">
            <li className="is-done">✓ {isUrlImport ? '链接安全校验' : '文件校验'}</li>
            <li className="is-done">✓ {isUrlImport ? '提交讯飞' : '分片上传完成'}</li>
            <li className="is-active">
              {preparingMedia
                ? isUrlImport
                  ? '◉ 远程音频读取'
                  : '◉ 媒体预处理'
                : '◉ 语音识别 (IFASR)'}
            </li>
            <li>○ 写入文件库</li>
          </ul>
        </div>
      )
    }

    if (phase === 'success') {
      return (
        <div className="import-progress-panel is-success">
          <span className="import-success-icon" aria-hidden="true">
            <Check className="h-10 w-10" />
          </span>
          <p className="import-progress-filename">
            {mergedFileId
              ? '已合并为 1 篇笔记'
              : batchTotal > 1
              ? `已完成 ${batchSucceeded} 个文件`
              : job?.status === 'completed'
                ? '转写完成'
                : '内容已生成，可查看'}
          </p>
          <p className="import-progress-meta">
            {mergedFileId
              ? `已合并 ${batchTotal} 个音频，内容已写入文件库`
              : batchTotal > 1
              ? batchFailed > 0
                ? `成功 ${batchSucceeded} 个，失败 ${batchFailed} 个`
                : `共 ${batchTotal} 个文件已加入文件库`
              : job?.fileName}
          </p>
          {batchTotal <= 1 && job?.resultText && (
            <p className="import-result-preview">{job.resultText.slice(0, 120)}…</p>
          )}
          {(batchTotal > 1 || job?.workspaceFileId) && (
            <div className="import-success-actions">
              {mergedFileId ? (
                <button
                  type="button"
                  className="import-success-link is-primary"
                  onClick={() => {
                    setModalOpen(false)
                    onClose()
                    navigate(ROUTES.fileDetail(mergedFileId))
                  }}
                >
                  查看合并笔记 →
                </button>
              ) : batchTotal > 1 ? (
                <button
                  type="button"
                  className="import-success-link is-primary"
                  onClick={() => {
                    setModalOpen(false)
                    onClose()
                    navigate(ROUTES.files)
                  }}
                >
                  查看文件库 →
                </button>
              ) : (
                <>
              <button
                type="button"
                className="import-success-link"
                onClick={() => {
                  setModalOpen(false)
                  onClose()
                    navigate(ROUTES.fileDetail(job!.workspaceFileId!))
                }}
              >
                查看文件 →
              </button>
              <button
                type="button"
                className="import-success-link is-primary"
                onClick={() => {
                  const attachment = jobToAttachment(job!)
                  if (!attachment) return
                  const state: ChatLaunchState = {
                    attachments: [attachment],
                    draft: defaultImportChatDraft(),
                  }
                  setModalOpen(false)
                  onClose()
                  navigate(ROUTES.chat, { state })
                }}
              >
                用此文件开始 Chat
              </button>
                </>
              )}
            </div>
          )}
        </div>
      )
    }

    if (phase === 'error') {
      return (
        <div className="import-progress-panel is-error">
          <AlertTriangle className="h-8 w-8" />
          <p className="import-progress-filename">导入失败</p>
          <p className="import-progress-meta">{errorMessage}</p>
          {job?.canRetryTranscribe && (
            <button type="button" className="import-progress-retry" onClick={() => void retryTranscribe()}>
              重新转写
            </button>
          )}
        </div>
      )
    }

    return (
      <>
        <ImportSourcePicker
          sourceType={sourceType}
          audioUrl={audioUrl}
          error={urlError}
          onSourceTypeChange={(nextSource) => {
            setSourceType(nextSource)
            setFileError(null)
            setUrlError(null)
          }}
          onAudioUrlChange={(value) => {
            setAudioUrl(value)
            setUrlError(null)
          }}
        />
        {sourceType === 'file' && (
          <>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*"
          multiple
          className="sr-only"
          onChange={onFileChange}
        />
        <button
          type="button"
          className="import-dropzone-trigger import-dropzone-trigger-compact"
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="import-dropzone-icon import-dropzone-icon-sm" aria-hidden="true">
            <Plus className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <span className="import-dropzone-title">选择/拖动音视频文件到这里</span>
          <span className="import-dropzone-hint">
            或 <span className="import-dropzone-link">微信扫码导入</span> 手机文件
          </span>
        </button>

        {selectedFiles.length > 0 && (
          <ul className="import-file-list">
            {selectedFiles.map((file, index) => (
              <li key={`${file.name}-${file.size}-${index}`} className="import-file-item">
                <Mic className="import-file-item-icon h-4 w-4" aria-hidden="true" />
                <div className="import-file-item-main">
                  <span className="import-file-item-name">{file.name}</span>
                  <span className="import-file-item-size">{formatSize(file.size)}</span>
                </div>
                <button
                  type="button"
                  className="import-file-item-remove"
                  aria-label={`移除 ${file.name}`}
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {fileError && <p className="import-file-error">{fileError}</p>}
        {storedManifest && selectedFiles.length === 0 && (
          <p className="import-resume-hint">检测到未完成上传：{storedManifest.fileName}，请重新选择同一文件以续传</p>
        )}
        <p className="import-file-count">
          共 ({selectedFiles.length}/{MAX_BATCH_FILES}) 个文件
        </p>
        <p className="import-dropzone-safe">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          数据安全保护 · 单文件最大 500MB
        </p>
          </>
        )}
      </>
    )
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    pickFiles(e.target.files)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    pickFiles(e.dataTransfer.files)
  }

  const togglePanel = (panel: Exclude<ImportPanel, null>) => {
    setOpenPanel((current) => (current === panel ? null : panel))
  }

  const addHotword = () => {
    const word = hotwordDraft.trim()
    if (!word || hotwords.includes(word)) return
    setHotwords((prev) => [...prev, word])
    setHotwordDraft('')
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="import-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="import-modal"
      >
        <header className="import-modal-header">
          <div className="import-modal-header-main">
            <h2 id={titleId} className="import-modal-title">
              {phase === 'success'
                ? '导入完成'
                : batchTotal > 1 && phase === 'error'
                  ? '批量导入失败'
                  : batchTotal > 1 && (phase === 'uploading' || phase === 'transcribing')
                    ? '批量处理中'
                : phase === 'transcribing'
                  ? '转写中'
                  : phase === 'uploading' || phase === 'upload_paused'
                    ? '上传中'
                    : '导入音视频文件'}
            </h2>
            <button type="button" className="import-modal-legacy-link">
              找不到功能？使用旧版
            </button>
          </div>
          <button
            type="button"
            className="import-modal-close"
            onClick={handleClose}
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="import-modal-body">
          <div
            className={cn(
              'import-dropzone',
              sourceType === 'url' && phase === 'idle' && 'is-url',
              dragOver && 'is-dragover',
              selectedFiles.length > 0 && 'has-file',
              settingsLocked && 'is-locked',
            )}
            onDragOver={(e) => {
              if (settingsLocked || sourceType === 'url') return
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              if (sourceType === 'file') onDrop(event)
            }}
          >
            {renderLeftPanel()}
          </div>

          <aside className={cn('import-modal-settings', settingsLocked && 'is-locked')}>
            {sourceType === 'file' && selectedFiles.length > 1 && (
              <div className="import-setting-block">
                <p className="import-setting-label">导入方式</p>
                <div className="import-mode-options" role="group" aria-label="导入方式">
                  <button
                    type="button"
                    className={cn('import-mode-option', importMode === 'separate' && 'is-active')}
                    onClick={() => !settingsLocked && setImportMode('separate')}
                    disabled={settingsLocked}
                  >
                    分别创建
                  </button>
                  <button
                    type="button"
                    className={cn('import-mode-option', importMode === 'merge' && 'is-active')}
                    onClick={() => !settingsLocked && setImportMode('merge')}
                    disabled={settingsLocked}
                  >
                    合并为一篇
                  </button>
                </div>
                <p className="import-mode-hint">
                  {importMode === 'merge'
                    ? '全部转写完成后合并成一篇笔记'
                    : '每个音频分别生成一篇笔记'}
                </p>
              </div>
            )}
            <div className="import-setting-block">
              <p className="import-setting-label">音频语言</p>
              <div className="import-lang-grid">
                {IMPORT_AUDIO_LANGUAGES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      'import-lang-btn',
                      language === item.id && 'is-active',
                      'more' in item && item.more && 'import-lang-btn-more',
                    )}
                    onClick={() => {
                      if (settingsLocked || ('more' in item && item.more)) return
                      setLanguage(item.id)
                    }}
                    disabled={settingsLocked}
                  >
                    {item.premium && <Crown className="import-lang-premium h-3 w-3" />}
                    <span>{item.label}</span>
                    {'more' in item && item.more && (
                      <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="import-setting-block">
              <p className="import-setting-label">说话人</p>
              <div className="import-setting-row-wrap">
                <button
                  type="button"
                  className={cn('import-setting-row', openPanel === 'speaker' && 'is-open')}
                  onClick={() => !settingsLocked && togglePanel('speaker')}
                  disabled={settingsLocked}
                  aria-expanded={openPanel === 'speaker'}
                >
                  <span>指定说话人数量</span>
                  <span className="import-setting-value">
                    {speakerLabel}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </button>
                {openPanel === 'speaker' && (
                  <div className="import-setting-popover import-speaker-popover" role="listbox">
                    {IMPORT_SPEAKER_COUNTS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={speakerCount === item.id}
                        className={cn(
                          'import-popover-option',
                          speakerCount === item.id && 'is-active',
                        )}
                        onClick={() => {
                          setSpeakerCount(item.id)
                          setOpenPanel(null)
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="import-setting-block">
              <p className="import-setting-label-row">
                <span>优化转写</span>
                <button
                  type="button"
                  className="import-setting-help"
                  aria-label="优化转写说明"
                  title="选择专业领域并添加热词，可提升转写准确率"
                >
                  <CircleHelp className="h-3.5 w-3.5" />
                </button>
              </p>

              <div className="import-setting-row-wrap">
                <button
                  type="button"
                  className={cn('import-setting-row', openPanel === 'domain' && 'is-open')}
                  onClick={() => !settingsLocked && togglePanel('domain')}
                  disabled={settingsLocked}
                  aria-expanded={openPanel === 'domain'}
                >
                  <span>专业领域</span>
                  <span className="import-setting-value">
                    {domainLabel}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </button>
                {openPanel === 'domain' && (
                  <div className="import-setting-popover import-domain-popover" role="listbox">
                    <div className="import-domain-grid">
                      {IMPORT_PROFESSIONAL_DOMAINS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={domain === item.id}
                          className={cn(
                            'import-domain-option',
                            domain === item.id && 'is-active',
                          )}
                          onClick={() => {
                            setDomain(item.id)
                            setOpenPanel(null)
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="import-hotword-block">
                <button
                  type="button"
                  className="import-setting-row import-hotword-toggle"
                  onClick={() => !settingsLocked && setHotwordsExpanded((v) => !v)}
                  disabled={settingsLocked}
                  aria-expanded={hotwordsExpanded}
                >
                  <span>热词优化</span>
                  <span className="import-setting-value">
                    {hotwordsExpanded ? '收起' : '展开'}
                    {hotwordsExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </span>
                </button>
                {hotwordsExpanded && (
                  <div className="import-hotword-panel">
                    <div className="import-hotword-input-wrap">
                      <input
                        type="text"
                        className="import-hotword-input"
                        placeholder="输入音频热词可提高准确率"
                        value={hotwordDraft}
                        onChange={(e) => setHotwordDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addHotword()
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="import-hotword-add"
                        aria-label="添加热词"
                        onClick={addHotword}
                        disabled={!hotwordDraft.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {hotwords.length > 0 && (
                      <div className="import-hotword-tags">
                        {hotwords.map((word) => (
                          <span key={word} className="import-hotword-tag">
                            {word}
                            <button
                              type="button"
                              className="import-hotword-tag-remove"
                              aria-label={`删除热词 ${word}`}
                              onClick={() =>
                                setHotwords((prev) => prev.filter((w) => w !== word))
                              }
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>

        <footer className="import-modal-footer">
          <button
            type="button"
            className="import-modal-records"
            onClick={() => setRecordsOpen(true)}
          >
            <Info className="h-4 w-4" />
            导入记录
          </button>
          <div className="import-modal-footer-actions">
            {phase === 'success' && (
              <button
                type="button"
                className="import-modal-secondary"
                onClick={resetImportForm}
              >
                继续导入
              </button>
            )}
            <button
              type="button"
              className="import-modal-submit"
              disabled={
                phase === 'idle'
                  ? sourceType === 'url'
                    ? !audioUrl.trim() || !!urlError
                    : selectedFiles.length === 0 || !!fileError
                  : false
              }
              onClick={() => {
                if (phase === 'success') {
                  if (mergedFileId) {
                    setModalOpen(false)
                    onClose()
                    navigate(ROUTES.fileDetail(mergedFileId))
                    return
                  }
                  if (batchTotal > 1) {
                    setModalOpen(false)
                    onClose()
                    navigate(ROUTES.files)
                    return
                  }
                  if (job?.workspaceFileId) {
                    setModalOpen(false)
                    onClose()
                    navigate(ROUTES.fileDetail(job.workspaceFileId!))
                  }
                  return
                }
                if (phase === 'error') {
                  resetImportForm()
                  return
                }
                if (phase === 'idle') {
                  handleSubmit()
                  return
                }
                if (phase === 'upload_paused' && activeFile) {
                  void resumeUpload(activeFile)
                  return
                }
                if (phase === 'transcribing' || phase === 'uploading') {
                  minimize()
                  onClose()
                }
              }}
            >
              {phase === 'success'
                ? mergedFileId
                  ? '查看合并笔记'
                  : batchTotal > 1
                  ? '查看文件库'
                  : '查看文件'
                : phase === 'error'
                  ? '重新选择'
                : phase === 'upload_paused'
                  ? '继续上传'
                  : phase === 'transcribing' || phase === 'uploading'
                    ? '后台继续'
                    : '提交'}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
