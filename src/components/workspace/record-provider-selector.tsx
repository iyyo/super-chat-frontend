import type { RtAsrProvider } from '@/lib/api/rtasr'
import { cn } from '@/lib/utils'

interface RecordProviderSelectorProps {
  value: RtAsrProvider
  disabled: boolean
  onChange: (value: RtAsrProvider) => void
}

const OPTIONS: Array<{ value: RtAsrProvider; label: string }> = [
  { value: 'xfyun', label: '讯飞' },
  { value: 'aliyun', label: '阿里云' },
]

export function RecordProviderSelector({
  value,
  disabled,
  onChange,
}: RecordProviderSelectorProps) {
  return (
    <div className="record-field">
      <span>转写服务</span>
      <div className="record-provider-options" role="radiogroup" aria-label="转写服务">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={cn('record-provider-option', value === option.value && 'is-active')}
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
