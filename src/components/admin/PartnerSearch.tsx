'use client'

import { useEffect, useState } from 'react'
import { Search, UserPlus } from 'lucide-react'

// Delays the search query so filtering happens 200 ms after the last keystroke.
export function useDebounced<T>(value: T, ms = 200) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

export function SearchInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="flex min-h-[48px] items-center gap-2 rounded-full bg-[#FFFFFF] px-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
      <Search className="h-4 w-4 shrink-0 text-[#4B5563]" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Suche: Firma, Stadt oder PLZ..."
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[#1A4D2E] outline-none placeholder:text-[#9CA3AF]"
      />
    </label>
  )
}

// "2 Treffer für '74523'" above the list, or the no-result box with suggestions and an invite link.
export function SearchFeedback({
  query,
  count,
  regionLabel,
  suggestions,
  onPick,
  postcode,
}: {
  query: string
  count: number
  regionLabel?: string
  suggestions: { key: string; label: string }[]
  onPick: (key: string) => void
  postcode: string | null
}) {
  const [copied, setCopied] = useState(false)
  const q = query.trim()
  if (!q) return null

  if (count > 0) {
    return (
      <p className="text-xs font-medium text-[#4B5563]" aria-live="polite">
        {count} {count === 1 ? 'Treffer' : 'Treffer'} für „{q}“{regionLabel ? ` in ${regionLabel}` : ''}
      </p>
    )
  }

  async function invite() {
    const link = `${window.location.origin}/partner/werden`
    const text = postcode
      ? `Wir suchen Reinigungspartner im PLZ-Gebiet ${postcode}. Jetzt bei KlarFix bewerben: ${link}`
      : `Jetzt Reinigungspartner bei KlarFix werden: ${link}`
    await navigator.clipboard.writeText(text).catch(() => null)
    setCopied(true)
  }

  return (
    <div className="rounded-[20px] bg-[#FFFAF5] p-5 text-sm text-[#1A4D2E] shadow-[0_2px_10px_rgba(0,0,0,0.05)]" aria-live="polite">
      <p className="font-semibold">
        Kein Treffer für „{q}“{regionLabel ? ` in ${regionLabel}` : ''}.
      </p>
      {suggestions.length > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-2">
          Meintest du:
          {suggestions.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => onPick(s.key)}
              className="rounded-full bg-[#1A4D2E] px-3 py-1 text-xs font-semibold text-[#FFFFFF] hover:bg-[#143D24]"
            >
              {s.label}?
            </button>
          ))}
        </p>
      )}
      <button
        type="button"
        onClick={invite}
        className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[#1A4D2E]/30 px-4 text-xs font-semibold hover:bg-[#F5F5F0]"
      >
        <UserPlus className="h-4 w-4" />
        {copied ? 'Einladungstext kopiert ✓' : postcode ? `+ Partner in PLZ ${postcode} einladen` : '+ Partner einladen'}
      </button>
    </div>
  )
}

// Tag on each card that shows why a result matched: "Stuttgart · PLZ 70597".
export function LocationTag({ city, postcode }: { city: string | null | undefined; postcode: string | null | undefined }) {
  const text = [city?.trim(), postcode ? `PLZ ${postcode}` : null].filter(Boolean).join(' · ') || 'Ohne PLZ'
  return (
    <span className="inline-flex max-w-full items-center rounded-full bg-[#E6F1E6] px-2.5 py-0.5 text-[11px] font-semibold text-[#1A4D2E]">
      <span className="truncate">{text}</span>
    </span>
  )
}
