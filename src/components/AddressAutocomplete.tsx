'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

export type AddressPick = { street: string; city: string; postcode: string }

type NominatimResult = {
  display_name: string
  address: {
    road?: string
    house_number?: string
    city?: string
    town?: string
    village?: string
    municipality?: string
    postcode?: string
    state?: string
  }
}

type Suggestion = { label: string; pick: AddressPick }

type Props = {
  value: string
  onChange: (text: string) => void
  onSelect: (pick: AddressPick) => void
  className?: string
}

function toSuggestion(r: NominatimResult): Suggestion {
  const a = r.address
  const street = [a.road, a.house_number].filter(Boolean).join(' ')
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? ''
  const postcode = a.postcode ?? ''
  const label = [street, city, a.state].filter(Boolean).join(', ')
  return { label, pick: { street, city, postcode } }
}

export default function AddressAutocomplete({ value, onChange, onSelect, className = '' }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
      controller.current?.abort()
    }
  }, [])

  function search(query: string) {
    controller.current?.abort()
    const ac = new AbortController()
    controller.current = ac
    setLoading(true)
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=de&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`,
      { headers: { 'Accept-Language': 'de' }, signal: ac.signal }
    )
      .then((res) => (res.ok ? (res.json() as Promise<NominatimResult[]>) : []))
      .then((results) => {
        setSuggestions(results.slice(0, 5).map(toSuggestion))
        setOpen(true)
      })
      .catch(() => {
        if (!ac.signal.aborted) setSuggestions([])
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })
  }

  function handleChange(text: string) {
    onChange(text)
    if (timer.current) clearTimeout(timer.current)
    if (text.trim().length < 2) {
      controller.current?.abort()
      setSuggestions([])
      setLoading(false)
      setOpen(false)
      return
    }
    timer.current = setTimeout(() => search(text.trim()), 300)
  }

  function handlePick(s: Suggestion) {
    if (timer.current) clearTimeout(timer.current)
    controller.current?.abort()
    onChange(s.label)
    onSelect(s.pick)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setOpen(false)}
          autoComplete="off"
          placeholder="Straße und Hausnummer, Stadt eingeben"
          className={className}
        />
        {loading && (
          <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#0F60C6]" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {suggestions.map((s, i) => (
            <li key={`${s.label}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  handlePick(s)
                }}
                className="w-full px-4 py-3 text-left text-sm transition-colors hover:bg-blue-50"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
