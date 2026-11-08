'use client'

import { ALL_GROUP, type RegionGroup } from '@/lib/regions'

// Tabs above partner lists: [Alle (9)] [Stuttgart (5)] [Schwäbisch Hall (2)] … — scrolls horizontally on small screens.
export default function RegionTabs({
  groups,
  total,
  active,
  onChange,
}: {
  groups: RegionGroup[]
  total: number
  active: string
  onChange: (key: string) => void
}) {
  const current = groups.find((g) => g.key === active)
  const tab = (key: string, label: string, count: number) => {
    const selected = key === active
    return (
      <button
        key={key}
        type="button"
        role="tab"
        aria-selected={selected}
        onClick={() => onChange(key)}
        className={`flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition ${
          selected ? 'bg-[#1A4D2E] text-[#FFFFFF]' : 'bg-[#FFFFFF] text-[#1A4D2E] shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:bg-[#F5F5F0]'
        }`}
      >
        {label}
        <span className={`rounded-full px-1.5 text-[11px] ${selected ? 'bg-[#FFFFFF]/20' : 'bg-[#F5F5F0]'}`}>{count}</span>
      </button>
    )
  }

  return (
    <div>
      <div role="tablist" aria-label="Nach Stadt / PLZ filtern" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {tab(ALL_GROUP, 'Alle', total)}
        {groups.map((g) => tab(g.key, g.label, g.count))}
      </div>
      {current && current.postcodes.length > 0 && (
        <p className="mt-2 text-xs text-[#4B5563]">PLZ: {current.postcodes.join(', ')}</p>
      )}
    </div>
  )
}
