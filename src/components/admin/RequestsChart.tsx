'use client'

import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type ChartRequest = { created_at: string; status: string }

type Range = '1T' | '1W' | '1M' | '3M' | '6M' | '1J' | 'Alle'
type Unit = 'hour' | 'day' | 'week'

const RANGES: { key: Range; unit: Unit; count: number }[] = [
  { key: '1T', unit: 'hour', count: 24 },
  { key: '1W', unit: 'day', count: 7 },
  { key: '1M', unit: 'day', count: 30 },
  { key: '3M', unit: 'week', count: 13 },
  { key: '6M', unit: 'week', count: 26 },
  { key: '1J', unit: 'week', count: 52 },
  { key: 'Alle', unit: 'week', count: 0 },
]

// Same status groups as the former stat cards (Anfragen gesamt / Offene Anfragen / In Bearbeitung).
const OPEN = new Set(['new', 'offer_rejected'])
const WORKING = new Set(['assigned', 'offer_sent', 'offer_accepted'])

const SERIES = [
  { key: 'total', label: 'Anfragen gesamt', color: '#1A4D2E', fill: '#A8D5A2', fillOpacity: 0.6 },
  { key: 'open', label: 'Offene Anfragen', color: '#E86A33', fill: '#E86A33', fillOpacity: 0.2 },
  { key: 'working', label: 'In Bearbeitung', color: '#2A9DCC', fill: '#2A9DCC', fillOpacity: 0.2 },
] as const

type Metric = (typeof SERIES)[number]['key']

type Point = { ts: number; total: number; open: number; working: number }

function bucketStart(date: Date, unit: Unit): Date {
  const d = new Date(date)
  d.setMinutes(0, 0, 0)
  if (unit === 'hour') return d
  d.setHours(0)
  if (unit === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday
  return d
}

function addUnits(date: Date, unit: Unit, n: number): Date {
  const d = new Date(date)
  if (unit === 'hour') d.setHours(d.getHours() + n)
  else d.setDate(d.getDate() + n * (unit === 'week' ? 7 : 1))
  return d
}

// "03. Okt" (de-DE short month without the trailing dot)
const dayLabel = (ts: number) =>
  new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }).replace(/\.$/, '')
const timeLabel = (ts: number) => new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

function buildSeries(requests: ChartRequest[], range: (typeof RANGES)[number], now: Date): Point[] {
  const { unit } = range
  let first: Date
  let last: Date
  if (unit === 'hour') {
    first = bucketStart(now, 'day')
    last = addUnits(first, 'hour', 23)
  } else {
    last = bucketStart(now, unit)
    if (range.count > 0) {
      first = addUnits(last, unit, -(range.count - 1))
    } else {
      const oldest = requests.reduce((min, r) => Math.min(min, new Date(r.created_at).getTime()), now.getTime())
      first = bucketStart(new Date(oldest), unit)
    }
  }

  const points: Point[] = []
  const index = new Map<number, Point>()
  for (let d = first; d <= last; d = addUnits(d, unit, 1)) {
    const p = { ts: d.getTime(), total: 0, open: 0, working: 0 }
    points.push(p)
    index.set(p.ts, p)
  }
  for (const r of requests) {
    const p = index.get(bucketStart(new Date(r.created_at), unit).getTime())
    if (!p) continue
    p.total += 1
    if (OPEN.has(r.status)) p.open += 1
    else if (WORKING.has(r.status)) p.working += 1
  }
  return points
}

export default function RequestsChart({ requests }: { requests: ChartRequest[] }) {
  const [rangeKey, setRangeKey] = useState<Range>('3M')
  const [metric, setMetric] = useState<Metric>('total')
  const series = SERIES.find((s) => s.key === metric)!
  const range = RANGES.find((r) => r.key === rangeKey)!
  const data = useMemo(() => buildSeries(requests, range, new Date()), [requests, range])

  const tickLabel = (ts: number) => (range.unit === 'hour' ? timeLabel(ts) : dayLabel(ts))
  const tooltipLabel = (ts: number) =>
    range.unit === 'hour' ? `${dayLabel(ts)} - ${timeLabel(ts)}` : range.unit === 'week' ? `Woche ab ${dayLabel(ts)}` : dayLabel(ts)

  return (
    <section className="mb-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1A4D2E] sm:text-2xl">Statistik</h2>
          <p className="text-[13px] text-[#4B5563]">Anfragen im Vergleich über Zeit</p>
        </div>
        <div role="tablist" aria-label="Zeitraum" className="flex gap-1 overflow-x-auto rounded-full bg-[#FFFFFF] p-1 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
          {RANGES.map((r) => {
            const active = r.key === rangeKey
            return (
              <button
                key={r.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRangeKey(r.key)}
                className={`min-h-[36px] min-w-[40px] shrink-0 rounded-full px-3 text-[13px] font-semibold transition ${
                  active ? 'bg-[#1A4D2E] text-[#FFFFFF]' : 'text-[#1A4D2E]/70 hover:bg-[#E6F1E6]'
                }`}
              >
                {r.key}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-[20px] bg-[#FFFAF5] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)] sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-[#1A4D2E]">Anfragen</h3>
          <div className="relative">
            <span
              className="pointer-events-none absolute start-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: series.color }}
              aria-hidden
            />
            <select
              aria-label="Kennzahl"
              value={metric}
              onChange={(e) => setMetric(e.target.value as Metric)}
              className="min-h-[40px] cursor-pointer appearance-none rounded-full border border-[#1A4D2E]/15 bg-[#FFFFFF] pe-9 ps-8 text-[13px] font-semibold text-[#1A4D2E] shadow-[0_2px_10px_rgba(0,0,0,0.05)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4D2E]/40"
            >
              {SERIES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A4D2E]/70" aria-hidden />
          </div>
        </div>

        <div className="h-64 w-full sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="fill-metric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series.fill} stopOpacity={series.fillOpacity} />
                  <stop offset="100%" stopColor={series.fill} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1A4D2E" strokeOpacity={0.08} vertical={false} />
              <XAxis
                dataKey="ts"
                tickFormatter={tickLabel}
                tick={{ fill: '#4B5563', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#1A4D2E', strokeOpacity: 0.15 }}
                minTickGap={24}
              />
              <YAxis allowDecimals={false} tick={{ fill: '#4B5563', fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                cursor={{ stroke: '#1A4D2E', strokeOpacity: 0.25, strokeDasharray: '4 4' }}
                content={({ active, payload }) => {
                  const p = active && payload?.length ? (payload[0].payload as Point) : null
                  if (!p) return null
                  return (
                    <div className="rounded-xl bg-[#FFFFFF] px-3 py-2 text-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-1 ring-[#1A4D2E]/10">
                      <p className="font-bold text-[#1A4D2E]">
                        {p[metric]} Anfragen - {tooltipLabel(p.ts)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[#4B5563]">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} aria-hidden />
                        {series.label}
                      </p>
                    </div>
                  )
                }}
              />
              <Area
                key={metric}
                type="monotone"
                dataKey={metric}
                name={series.label}
                stroke={series.color}
                strokeWidth={2}
                fill="url(#fill-metric)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: '#FFFFFF' }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
