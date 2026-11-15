'use client'

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

// 4 separate password boxes (maxLength 1 each): auto-advance, backspace goes back, paste fills all.
export default function PinInput({
  value,
  onChange,
  onComplete,
  disabled,
  idPrefix = 'pin',
}: {
  value: string[]
  onChange: (next: string[]) => void
  onComplete?: () => void
  disabled?: boolean
  idPrefix?: string
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  function setDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = [...value]
    next[index] = digit
    onChange(next)
    if (digit && index < 3) refs.current[index + 1]?.focus()
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value[index] && index > 0) refs.current[index - 1]?.focus()
    else if (e.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus()
    else if (e.key === 'ArrowRight' && index < 3) refs.current[index + 1]?.focus()
    else if (e.key === 'Enter' && value.every(Boolean)) onComplete?.()
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (!digits) return
    e.preventDefault()
    onChange([0, 1, 2, 3].map((i) => digits[i] ?? ''))
    refs.current[digits.length - 1]?.focus()
  }

  return (
    <div role="group" aria-label="PIN" dir="ltr" className="flex justify-center gap-3">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          id={`${idPrefix}-${i}`}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={1}
          aria-label={`PIN Ziffer ${i + 1}`}
          value={value[i] ?? ''}
          disabled={disabled}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
          className="h-16 w-14 rounded-2xl border-2 border-[#F0E4DA] bg-[#FFFFFF] text-center text-3xl font-bold text-[#1B4332] outline-none transition focus:border-[#E86A33] focus:shadow-[0_0_0_4px_rgba(232,106,51,0.15)] disabled:opacity-40 sm:h-20 sm:w-16"
        />
      ))}
    </div>
  )
}
