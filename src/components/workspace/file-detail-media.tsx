import { useEffect, useState, type RefObject } from 'react'
import { RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileDetailMediaProps {
  mediaRef: RefObject<HTMLVideoElement | null>
  src: string
  title: string
  isVideo: boolean
}

export function FileDetailMedia({ mediaRef, src, title, isVideo }: FileDetailMediaProps) {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setError(null), [src])

  return (
    <div className={cn('file-detail-media-frame', !isVideo && 'is-audio-only')}>
      <video
        ref={mediaRef}
        className={cn('file-detail-media', !isVideo && 'is-audio-only')}
        src={src}
        preload="metadata"
        playsInline
        controls={isVideo}
        aria-label={isVideo ? `${title} 视频` : `${title} 音频`}
        onLoadedMetadata={() => setError(null)}
        onError={() => setError(isVideo ? '视频加载失败' : '音频加载失败')}
      />
      {isVideo && error ? (
        <div className="file-detail-media-error" role="alert">
          <strong>{error}</strong>
          <button
            type="button"
            onClick={() => {
              setError(null)
              mediaRef.current?.load()
            }}
          >
            <RotateCw className="h-4 w-4" />
            重新加载
          </button>
        </div>
      ) : null}
    </div>
  )
}
