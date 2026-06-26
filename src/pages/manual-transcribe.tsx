import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  Download,
  FilePlus2,
  Headphones,
  Info,
  Receipt,
  ShieldCheck,
} from 'lucide-react'
import {
  APP_NAME,
  MANUAL_DRAFT_TYPES,
  MANUAL_LANGUAGES,
  MANUAL_REQUIREMENTS,
  MANUAL_SPEED_OPTIONS,
  ROUTES,
} from '@/lib/constants'
import { cn } from '@/lib/utils'

export function ManualTranscribePage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [language, setLanguage] = useState('zh')
  const [draftType, setDraftType] = useState('role')
  const [requirement, setRequirement] = useState('smooth')
  const [speed, setSpeed] = useState('normal')
  const [timecode, setTimecode] = useState(false)

  const totalDuration = '00:00:00'

  const onPickFiles = (list: FileList | null) => {
    if (!list?.length) return
    setFiles(Array.from(list))
  }

  return (
    <div className="manual-page">
      <header className="manual-topbar">
        <div className="manual-topbar-inner">
          <div className="manual-topbar-brand">
            <span className="manual-topbar-platform">智慧办公 SaaS 平台</span>
            <span className="manual-topbar-sep" aria-hidden="true" />
            <Link to={ROUTES.app} className="manual-topbar-logo">
              {APP_NAME}
            </Link>
          </div>
          <button type="button" className="manual-topbar-user" aria-label="用户菜单">
            <span className="manual-topbar-avatar" />
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </header>

      <div className="manual-shell">
        <div className="manual-main">
          <div className="manual-page-head">
            <h1 className="manual-page-title">
              人工精转
              <button type="button" className="manual-page-pricing">
                收费标准
              </button>
            </h1>
          </div>

          <div className="manual-body">
            <section className="manual-upload-panel">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                multiple
                className="sr-only"
                onChange={(e) => onPickFiles(e.target.files)}
              />
              <button
                type="button"
                className="manual-upload-zone"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="manual-upload-icon" aria-hidden="true">
                  <FilePlus2 className="h-8 w-8" strokeWidth={1.5} />
                </span>
                <span className="manual-upload-title">点击添加音频、视频</span>
                <span className="manual-upload-hint">
                  专业团队多轮校验 · 支持定制化服务 · 音视频格式支持
                  <Info className="inline h-3.5 w-3.5 align-[-2px] opacity-50" />
                </span>
                {files.length > 0 && (
                  <span className="manual-upload-count">已选 {files.length} 个文件</span>
                )}
              </button>
              <p className="manual-upload-safe">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                数据安全保护
              </p>
            </section>

            <aside className="manual-settings">
              <div className="manual-setting-block">
                <p className="manual-setting-label">音频语言</p>
                <div className="manual-lang-grid">
                  {MANUAL_LANGUAGES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        'manual-chip',
                        language === item.id && 'is-active',
                        'more' in item && item.more && 'manual-chip-more',
                      )}
                      onClick={() => {
                        if (!('more' in item) || !item.more) setLanguage(item.id)
                      }}
                    >
                      <span>{item.label}</span>
                      {'more' in item && item.more && (
                        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="manual-setting-block">
                <p className="manual-setting-label">出稿类型</p>
                <div className="manual-chip-row">
                  {MANUAL_DRAFT_TYPES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cn('manual-chip manual-chip-wide', draftType === item.id && 'is-active')}
                      onClick={() => setDraftType(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="manual-setting-block">
                <p className="manual-setting-label">出稿要求</p>
                <div className="manual-req-grid">
                  {MANUAL_REQUIREMENTS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cn('manual-req-card', requirement === item.id && 'is-active')}
                      onClick={() => setRequirement(item.id)}
                    >
                      <span className="manual-req-title">{item.title}</span>
                      <span className="manual-req-desc">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="manual-setting-block">
                <p className="manual-setting-label">出稿速度</p>
                <div className="manual-speed-grid">
                  {MANUAL_SPEED_OPTIONS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cn('manual-speed-card', speed === item.id && 'is-active')}
                      onClick={() => setSpeed(item.id)}
                    >
                      <span className="manual-speed-label">{item.label}</span>
                      <span className="manual-speed-hint">{item.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="manual-timecode">
                <input
                  type="checkbox"
                  checked={timecode}
                  onChange={(e) => setTimecode(e.target.checked)}
                />
                <span>标记时间码</span>
                <span className="manual-timecode-hint">可设置每 1 分钟或 5 分钟标记一次</span>
              </label>
            </aside>
          </div>
        </div>

        <aside className="manual-rail" aria-label="快捷服务">
          <button type="button" className="manual-rail-btn">
            <Download className="h-4 w-4" />
            <span>下载客户端</span>
          </button>
          <button type="button" className="manual-rail-btn">
            <Receipt className="h-4 w-4" />
            <span>资费</span>
          </button>
          <button type="button" className="manual-rail-btn">
            <Headphones className="h-4 w-4" />
            <span>客服</span>
          </button>
          <div className="manual-rail-qr">
            <div className="manual-rail-qr-box" aria-hidden="true" />
            <p>人工精转专员为您服务</p>
            <p className="manual-rail-qr-time">9:00 - 22:00</p>
          </div>
        </aside>
      </div>

      <footer className="manual-footer-bar">
        <p className="manual-footer-meta">
          共 {files.length} 条音频，总时长：{totalDuration}
        </p>
        <button type="button" className="manual-footer-submit" disabled={files.length === 0}>
          提交转写
        </button>
      </footer>
    </div>
  )
}
