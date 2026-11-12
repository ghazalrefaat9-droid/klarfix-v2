'use client'

import { useLang } from '@/components/LanguageProvider'

export const AREA_MIN = 20
export const AREA_MAX = 300
export const AREA_DEFAULT = 60
export const AREA_MANUAL_MIN = 301
export const AREA_MANUAL_MAX = 5000
const QUICK_VALUES = [30, 50, 80, 120, 300]

export function isValidManualArea(value: string) {
  const n = Number(value)
  return /^\d+$/.test(value.trim()) && n >= AREA_MANUAL_MIN && n <= AREA_MANUAL_MAX
}

type Props = {
  slider: number
  // null = slider mode; a string = manual input for areas above 300 m²
  manual: string | null
  onSliderChange: (value: number) => void
  onManualChange: (value: string | null) => void
  showManualError: boolean
}

export default function AreaPicker({ slider, manual, onSliderChange, onManualChange, showManualError }: Props) {
  const { t } = useLang()
  const isManual = manual !== null
  const manualInvalid = isManual && !isValidManualArea(manual)
  const display = isManual ? (isValidManualArea(manual) ? manual : '–') : String(slider)

  const quickClass = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
      active ? 'border-primary bg-primary text-card' : 'border-primary/20 bg-card text-primary hover:bg-primary/5'
    }`

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={isManual ? 'buchen-area-manual' : 'buchen-area'} className="text-sm font-medium">
          {t('Fläche', 'المساحة', 'Area')}
        </label>
        <p className="text-3xl font-bold leading-none text-primary" aria-live="polite">
          {display} <span className="text-lg font-semibold">m²</span>
        </p>
      </div>

      {isManual ? (
        <div className="space-y-2">
          <div className="relative">
            <input
              id="buchen-area-manual"
              inputMode="numeric"
              autoFocus
              placeholder={t('z.B. 450', 'مثال: 450', 'e.g. 450')}
              value={manual}
              onChange={(e) => onManualChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
              aria-invalid={showManualError && manualInvalid}
              aria-describedby="buchen-area-manual-help"
              className={`mt-1 w-full rounded-lg border bg-card py-2 pl-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                showManualError && manualInvalid ? 'border-danger focus:border-danger' : 'border-primary/20 focus:border-primary'
              }`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-sm font-semibold text-primary/70">
              m²
            </span>
          </div>
          <p id="buchen-area-manual-help" className="text-xs text-primary/60">
            {t(
              'Größer als 300 m²? Bitte genaue Fläche eingeben.',
              'أكبر من 300 م²؟ يرجى إدخال المساحة الدقيقة.',
              'Larger than 300 m²? Please enter the exact area.',
            )}
          </p>
          {showManualError && manualInvalid && (
            <p role="alert" className="text-xs text-danger">
              {t(
                'Bitte eine Fläche zwischen 301 und 5000 m² eingeben.',
                'يرجى إدخال مساحة بين 301 و 5000 م².',
                'Please enter an area between 301 and 5000 m².',
              )}
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
            id="buchen-area"
            type="range"
            min={AREA_MIN}
            max={AREA_MAX}
            step={5}
            value={slider}
            onChange={(e) => onSliderChange(Number(e.target.value))}
            aria-valuetext={`${slider} m²`}
            className="h-2 w-full cursor-pointer"
          />
          <div className="flex justify-between text-xs text-primary/60" aria-hidden="true">
            <span>{AREA_MIN} m²</span>
            <span>{AREA_MAX} m²</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_VALUES.map((v) => (
              <button key={v} type="button" onClick={() => onSliderChange(v)} aria-pressed={slider === v} className={quickClass(slider === v)}>
                {v}
              </button>
            ))}
            <button type="button" onClick={() => onManualChange('')} className={quickClass(false)}>
              +300
            </button>
          </div>
        </>
      )}
    </section>
  )
}
