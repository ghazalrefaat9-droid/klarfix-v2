'use client'

import { useLang } from '@/components/LanguageProvider'

// Shared by area and rooms on /buchen: slider with a big value display, plus one "+max" button
// that switches to a manual input for values above the slider range.
export type SliderConfig = {
  min: number
  max: number
  step: number
  manualMin: number
  manualMax: number
  maxDigits: number
}

export const AREA_CONFIG: SliderConfig = { min: 20, max: 300, step: 5, manualMin: 301, manualMax: 5000, maxDigits: 4 }
export const AREA_DEFAULT = 60
export const ROOMS_CONFIG: SliderConfig = { min: 1, max: 5, step: 1, manualMin: 6, manualMax: 50, maxDigits: 2 }
export const ROOMS_DEFAULT = 3

export function isValidManual(value: string, config: SliderConfig) {
  const n = Number(value)
  return /^\d+$/.test(value.trim()) && n >= config.manualMin && n <= config.manualMax
}

type Props = {
  id: string
  label: string
  // Unit next to the number, e.g. "m²" or "Zimmer"
  unit: string
  config: SliderConfig
  slider: number
  // null = slider mode; a string = manual input above the slider range
  manual: string | null
  onSliderChange: (value: number) => void
  onManualChange: (value: string | null) => void
  manualPlaceholder: string
  manualHelp: string
  manualError: string
  showManualError: boolean
}

export default function SliderPicker({
  id,
  label,
  unit,
  config,
  slider,
  manual,
  onSliderChange,
  onManualChange,
  manualPlaceholder,
  manualHelp,
  manualError,
  showManualError,
}: Props) {
  const { t } = useLang()
  const isManual = manual !== null
  const manualInvalid = isManual && !isValidManual(manual, config)
  const display = isManual ? (manualInvalid ? '–' : manual) : String(slider)
  const manualId = `${id}-manual`

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={isManual ? manualId : id} className="text-sm font-medium">
          {label}
        </label>
        <p className="text-3xl font-bold leading-none text-primary" aria-live="polite">
          {display} <span className="text-lg font-semibold">{unit}</span>
        </p>
      </div>

      {isManual ? (
        <div className="space-y-2">
          <div className="relative">
            <input
              id={manualId}
              inputMode="numeric"
              autoFocus
              placeholder={manualPlaceholder}
              value={manual}
              onChange={(e) => onManualChange(e.target.value.replace(/\D/g, '').slice(0, config.maxDigits))}
              aria-invalid={showManualError && manualInvalid}
              aria-describedby={`${manualId}-help`}
              className={`mt-1 w-full rounded-lg border bg-card py-2 pl-3 pr-20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                showManualError && manualInvalid ? 'border-danger focus:border-danger' : 'border-primary/20 focus:border-primary'
              }`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-sm font-semibold text-primary/70">
              {unit}
            </span>
          </div>
          <p id={`${manualId}-help`} className="text-xs text-primary/60">
            {manualHelp}
          </p>
          {showManualError && manualInvalid && (
            <p role="alert" className="text-xs text-danger">
              {manualError}
            </p>
          )}
          <button
            type="button"
            onClick={() => onManualChange(null)}
            className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
          >
            {t('← Zurück zum Slider', '→ العودة إلى المنزلق', '← Back to slider')}
          </button>
        </div>
      ) : (
        <>
          <input
            id={id}
            type="range"
            min={config.min}
            max={config.max}
            step={config.step}
            value={slider}
            onChange={(e) => onSliderChange(Number(e.target.value))}
            aria-valuetext={`${slider} ${unit}`}
            className="h-2 w-full cursor-pointer"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-primary/60" aria-hidden="true">
              {config.min}–{config.max} {unit}
            </span>
            <button
              type="button"
              onClick={() => onManualChange('')}
              className="rounded-lg border border-primary/20 bg-card px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary/5"
            >
              +{config.max}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
