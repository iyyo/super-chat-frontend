import { Link2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import '@/styles/import-url.css'

export type ImportSourceType = 'file' | 'url'

interface ImportSourcePickerProps {
  sourceType: ImportSourceType
  audioUrl: string
  error: string | null
  disabled?: boolean
  onSourceTypeChange: (sourceType: ImportSourceType) => void
  onAudioUrlChange: (value: string) => void
}

export function ImportSourcePicker({
  sourceType,
  audioUrl,
  error,
  disabled = false,
  onSourceTypeChange,
  onAudioUrlChange,
}: ImportSourcePickerProps) {
  return (
    <div className="import-source-picker">
      <div className="import-source-segment" role="tablist" aria-label="导入来源">
        <button
          type="button"
          role="tab"
          aria-selected={sourceType === 'file'}
          className={cn(sourceType === 'file' && 'is-active')}
          disabled={disabled}
          onClick={() => onSourceTypeChange('file')}
        >
          <Upload aria-hidden="true" />
          本地文件
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sourceType === 'url'}
          className={cn(sourceType === 'url' && 'is-active')}
          disabled={disabled}
          onClick={() => onSourceTypeChange('url')}
        >
          <Link2 aria-hidden="true" />
          音频链接
        </button>
      </div>

      {sourceType === 'url' && (
        <div className="import-url-panel" role="tabpanel">
          <label htmlFor="import-audio-url">公开音频地址</label>
          <div className={cn('import-url-input-wrap', error && 'is-error')}>
            <Link2 aria-hidden="true" />
            <input
              id="import-audio-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              maxLength={512}
              value={audioUrl}
              disabled={disabled}
              placeholder="https://media.example.com/meeting.mp3"
              onChange={(event) => onAudioUrlChange(event.target.value)}
            />
          </div>
          {error ? (
            <p className="import-url-message is-error">{error}</p>
          ) : (
            <p className="import-url-message">MP3、WAV、PCM、OPUS、FLAC、OGG、SPEEX · 最大 500MB</p>
          )}
        </div>
      )}
    </div>
  )
}
