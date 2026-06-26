import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronRight,
  Crown,
  FolderPlus,
  Info,
  ShieldCheck,
  X,
} from 'lucide-react'
import { IMPORT_AUDIO_LANGUAGES } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface ImportMediaModalProps {
  open: boolean
  onClose: () => void
}

export function ImportMediaModal({ open, onClose }: ImportMediaModalProps) {
  const titleId = useId()
  const overlayRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [language, setLanguage] = useState('zh-en')
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (!open) {
      setSelectedFile(null)
      setLanguage('zh-en')
      setDragOver(false)
      return
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const pickFile = (file: File | null) => {
    if (!file) return
    setSelectedFile(file)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    pickFile(e.target.files?.[0] ?? null)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    pickFile(e.dataTransfer.files?.[0] ?? null)
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
              导入音视频文件
            </h2>
            <button type="button" className="import-modal-legacy-link">
              找不到功能？使用旧版
            </button>
          </div>
          <button
            type="button"
            className="import-modal-close"
            onClick={onClose}
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="import-modal-body">
          <div
            className={cn('import-dropzone', dragOver && 'is-dragover', selectedFile && 'has-file')}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              className="sr-only"
              onChange={onFileChange}
            />
            <button
              type="button"
              className="import-dropzone-trigger"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="import-dropzone-icon" aria-hidden="true">
                <FolderPlus className="h-7 w-7" strokeWidth={1.5} />
              </span>
              {selectedFile ? (
                <>
                  <span className="import-dropzone-title">{selectedFile.name}</span>
                  <span className="import-dropzone-hint">点击重新选择文件</span>
                </>
              ) : (
                <>
                  <span className="import-dropzone-title">选择/拖动音视频文件到这里</span>
                  <span className="import-dropzone-hint">
                    或 <button type="button" className="import-dropzone-link">微信扫码导入</button> 手机文件
                  </span>
                </>
              )}
            </button>
            <p className="import-dropzone-safe">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              数据安全保护 · 准确率最高 98% · 音视频格式支持
            </p>
          </div>

          <aside className="import-modal-settings">
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
                      if (!('more' in item) || !item.more) setLanguage(item.id)
                    }}
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
              <button type="button" className="import-setting-row">
                <span>指定说话人数量</span>
                <span className="import-setting-value">
                  自动
                  <ChevronRight className="h-4 w-4" />
                </span>
              </button>
            </div>

            <div className="import-setting-block">
              <p className="import-setting-label">优化转写</p>
              <button type="button" className="import-setting-row">
                <span>专业领域</span>
                <span className="import-setting-value">
                  通用
                  <ChevronRight className="h-4 w-4" />
                </span>
              </button>
              <button type="button" className="import-setting-row">
                <span>热词优化</span>
                <span className="import-setting-value">
                  展开
                  <ChevronRight className="h-4 w-4" />
                </span>
              </button>
            </div>
          </aside>
        </div>

        <footer className="import-modal-footer">
          <button type="button" className="import-modal-records">
            <Info className="h-4 w-4" />
            导入记录
          </button>
          <button
            type="button"
            className="import-modal-submit"
            disabled={!selectedFile}
            onClick={onClose}
          >
            提交
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
