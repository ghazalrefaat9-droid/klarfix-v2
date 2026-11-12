'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Loader2, MapPin } from 'lucide-react'

// street = road + house number; road/houseNumber are the separate parts.
export type AddressPick = {
  street: string
  road: string
  houseNumber: string
  postcode: string
  city: string
  label: string
}

type Suggestion = AddressPick & { googlePlaceId?: string }

type PhotonFeature = {
  properties: {
    type?: string
    name?: string
    street?: string
    housenumber?: string
    postcode?: string
    city?: string
    town?: string
    village?: string
    district?: string
    countrycode?: string
  }
}

type GooglePrediction = {
  placePrediction?: { placeId: string; text?: { text: string } }
}

type GoogleAddressComponent = { longText: string; types: string[] }

type Props = {
  value: string
  onChange: (text: string) => void
  onSelect: (pick: AddressPick) => void
  onBlur?: () => void
  className?: string
  placeholder?: string
  required?: boolean
  id?: string
}

const MIN_CHARS = 3
const DEBOUNCE_MS = 400
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

export function formatAddress(street: string, postcode: string, city: string) {
  return [street, [postcode, city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

function parsePhoton(f: PhotonFeature): Suggestion | null {
  const p = f.properties
  if (p.countrycode && p.countrycode !== 'DE') return null
  const road = p.street ?? (p.type === 'street' ? p.name : undefined)
  const houseNumber = road ? p.housenumber ?? '' : ''
  const street = road ? [road, houseNumber].filter(Boolean).join(' ') : p.name ?? ''
  const city = p.city ?? p.town ?? p.village ?? p.district ?? ''
  const postcode = p.postcode ?? ''
  const label = formatAddress(street, postcode, city)
  return label ? { street, road: road ?? p.name ?? '', houseNumber, postcode, city, label } : null
}

async function searchPhoton(query: string, signal: AbortSignal): Promise<Suggestion[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=de&bbox=5.8,47.2,15.0,55.0`
  const res = await fetch(url, { headers: { 'Accept-Language': 'de' }, signal })
  if (!res.ok) return []
  const data = (await res.json()) as { features?: PhotonFeature[] }
  const seen = new Set<string>()
  const results: Suggestion[] = []
  for (const f of data.features ?? []) {
    const s = parsePhoton(f)
    if (s && !seen.has(s.label)) {
      seen.add(s.label)
      results.push(s)
    }
  }
  return results
}

async function searchGoogle(query: string, signal: AbortSignal): Promise<Suggestion[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_KEY! },
    body: JSON.stringify({ input: query, includedRegionCodes: ['de'], languageCode: 'de' }),
    signal,
  })
  if (!res.ok) throw new Error(`Google Places ${res.status}`)
  const data = (await res.json()) as { suggestions?: GooglePrediction[] }
  return (data.suggestions ?? [])
    .flatMap((s) => (s.placePrediction ? [s.placePrediction] : []))
    .slice(0, 5)
    .map((p) => ({
      street: '',
      road: '',
      houseNumber: '',
      postcode: '',
      city: '',
      label: p.text?.text ?? '',
      googlePlaceId: p.placeId,
    }))
}

// Google predictions don't include the postcode, so it is resolved on selection.
async function resolveGoogle(s: Suggestion): Promise<AddressPick> {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${s.googlePlaceId}?languageCode=de`,
    { headers: { 'X-Goog-Api-Key': GOOGLE_KEY!, 'X-Goog-FieldMask': 'addressComponents' } },
  )
  if (!res.ok) return s
  const { addressComponents = [] } = (await res.json()) as { addressComponents?: GoogleAddressComponent[] }
  const get = (type: string) => addressComponents.find((c) => c.types.includes(type))?.longText ?? ''
  const road = get('route')
  const houseNumber = get('street_number')
  const street = [road, houseNumber].filter(Boolean).join(' ')
  const postcode = get('postal_code')
  const city = get('locality') || get('postal_town')
  const label = street ? formatAddress(street, postcode, city) : s.label
  return { street, road, houseNumber, postcode, city, label }
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  onBlur,
  className = '',
  placeholder,
  required,
  id,
}: Props) {
  const [addressSuggestions, setAddressSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [query, setQuery] = useState('')
  const useGoogle = useRef(!!GOOGLE_KEY)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  useEffect(() => {
    const q = query.trim()
    if (q.length < MIN_CHARS) return
    const ac = new AbortController()
    const timer = setTimeout(async () => {
      setIsLoadingAddress(true)
      try {
        let results: Suggestion[]
        try {
          results = useGoogle.current ? await searchGoogle(q, ac.signal) : await searchPhoton(q, ac.signal)
        } catch (err) {
          if (ac.signal.aborted || !useGoogle.current) throw err
          // Google key missing/invalid: fall back to Photon for the rest of the session.
          useGoogle.current = false
          results = await searchPhoton(q, ac.signal)
        }
        setAddressSuggestions(results)
        setActiveIndex(-1)
        // Results can arrive after the user already left the field.
        setShowSuggestions(document.activeElement === inputRef.current)
      } catch {
        if (!ac.signal.aborted) setAddressSuggestions([])
      } finally {
        if (!ac.signal.aborted) setIsLoadingAddress(false)
      }
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      ac.abort()
    }
  }, [query])

  function handleChange(text: string) {
    onChange(text)
    setQuery(text)
    if (text.trim().length < MIN_CHARS) {
      setAddressSuggestions([])
      setShowSuggestions(false)
      setIsLoadingAddress(false)
    }
  }

  async function handlePick(s: Suggestion) {
    setQuery('')
    setShowSuggestions(false)
    setAddressSuggestions([])
    onChange(s.label)
    const pick = s.googlePlaceId ? await resolveGoogle(s).catch(() => s) : s
    if (pick.label !== s.label) onChange(pick.label)
    onSelect(pick)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || addressSuggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % addressSuggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? addressSuggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handlePick(addressSuggestions[activeIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setShowSuggestions(false)
    }
  }

  const isOpen = showSuggestions && addressSuggestions.length > 0

  return (
    <div className="relative">
      <div className="relative">
        <MapPin
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 mt-0.5 -translate-y-1/2 text-primary/60"
        />
        <input
          ref={inputRef}
          id={id}
          value={value}
          required={required}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => {
            setShowSuggestions(false)
            onBlur?.()
          }}
          autoComplete="off"
          placeholder={placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          className={`${className} pl-9 pr-9`}
        />
        {isLoadingAddress && (
          <Loader2
            size={16}
            aria-label="Lädt"
            className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 animate-spin text-primary"
          />
        )}
      </div>

      {isOpen && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-[240px] w-full overflow-y-auto rounded-lg border border-primary/10 bg-card shadow-lg"
        >
          {addressSuggestions.map((s, i) => (
            <li
              key={`${s.label}-${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              // mousedown + preventDefault keeps focus so onBlur doesn't close the list before the pick
              onMouseDown={(e) => {
                e.preventDefault()
                handlePick(s)
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex cursor-pointer items-start gap-2 px-3 py-2 text-sm text-primary transition-colors hover:bg-primary/5 ${
                i === activeIndex ? 'bg-primary/10' : ''
              }`}
            >
              <MapPin size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-primary/50" />
              <span>{s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
