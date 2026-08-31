import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLlmPreferenceStore } from '@/stores/llm-preference-store'

interface LlmProviderPickerProps {
  disabled?: boolean
  className?: string
}

type OpenField = 'provider' | 'model' | null

export function LlmProviderPicker({ disabled = false, className }: LlmProviderPickerProps) {
  const {
    providers,
    selectedProvider,
    selectedModel,
    loaded,
    fetchProviders,
    setSelection,
  } = useLlmPreferenceStore()
  const [openField, setOpenField] = useState<OpenField>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loaded) void fetchProviders()
  }, [fetchProviders, loaded])

  useEffect(() => {
    if (!openField) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenField(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenField(null)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [openField])

  if (!loaded || providers.length === 0) return null

  const active = providers.find((item) => item.id === selectedProvider) ?? providers[0]
  const activeModelId = selectedModel ?? active.defaultModel
  const activeModel =
    active.models.find((item) => item.id === activeModelId) ?? active.models[0]
  const showModelSelect = active.models.length > 1

  const toggle = (field: Exclude<OpenField, null>) => {
    if (disabled) return
    setOpenField((prev) => (prev === field ? null : field))
  }

  return (
    <div className={cn('workspace-llm-picker', className)} ref={rootRef}>
      <div className="workspace-llm-picker-field">
        <button
          type="button"
          className={cn(
            'workspace-llm-picker-trigger',
            openField === 'provider' && 'is-open',
          )}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={openField === 'provider'}
          aria-label="选择 AI 提供商"
          onClick={() => toggle('provider')}
        >
          <span className="workspace-llm-picker-kicker">模型</span>
          <span className="workspace-llm-picker-value">{active.label}</span>
          <ChevronDown className="workspace-llm-picker-chevron" aria-hidden />
        </button>

        {openField === 'provider' ? (
          <div className="workspace-llm-picker-menu" role="listbox" aria-label="AI 提供商">
            {providers.map((provider) => {
              const selected = provider.id === active.id
              return (
                <button
                  key={provider.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    'workspace-llm-picker-option',
                    selected && 'is-selected',
                  )}
                  onClick={() => {
                    setSelection(provider.id)
                    setOpenField(null)
                  }}
                >
                  <span>{provider.label}</span>
                  {selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      {showModelSelect && activeModel ? (
        <div className="workspace-llm-picker-field">
          <button
            type="button"
            className={cn(
              'workspace-llm-picker-trigger',
              openField === 'model' && 'is-open',
            )}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={openField === 'model'}
            aria-label="选择模型版本"
            onClick={() => toggle('model')}
          >
            <span className="workspace-llm-picker-kicker">版本</span>
            <span className="workspace-llm-picker-value">{activeModel.label}</span>
            <ChevronDown className="workspace-llm-picker-chevron" aria-hidden />
          </button>

          {openField === 'model' ? (
            <div className="workspace-llm-picker-menu" role="listbox" aria-label="模型版本">
              {active.models.map((model) => {
                const selected = model.id === activeModel.id
                return (
                  <button
                    key={model.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      'workspace-llm-picker-option',
                      selected && 'is-selected',
                    )}
                    onClick={() => {
                      setSelection(active.id, model.id)
                      setOpenField(null)
                    }}
                  >
                    <span>{model.label}</span>
                    {selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
