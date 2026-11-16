'use client'

import { useEffect, useRef, type ReactNode } from 'react'

const TERRA = '#C67A4A'
const GOLD = '#E9B44C'
const MINT = '#2EC4B6'
const PEACH = '#F5C8A0'
const W = '#FFFFFF'

const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const

// Small white glint (4-point star) used as the glossy highlight.
const glint = (x: number, y: number, r = 3.2): ReactNode => (
  <path
    d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`}
    fill={W}
  />
)

const ICONS: Record<string, ReactNode> = {
  vacuum: (
    <>
      <circle cx="14" cy="36" r="7" fill={TERRA} />
      <path d="M14 30 L23 10 L31 10" stroke={PEACH} strokeWidth="3.4" {...line} />
      <path d="M25 40 H44 L41 30 H28 Z" fill={TERRA} />
      <path d="M12 33 Q13 31 15 31" stroke={W} strokeWidth="1.8" {...line} />
      {glint(37, 34, 2.8)}
    </>
  ),
  spray: (
    <>
      <rect x="13" y="20" width="18" height="23" rx="5" fill={MINT} />
      <path d="M18 20 V13 H31 L36 17" stroke={TERRA} strokeWidth="3.6" {...line} />
      <path d="M39 11 H43 M39 17 H44 M39 23 H43" stroke={MINT} strokeWidth="2.4" {...line} />
      <path d="M17 26 V36" stroke={W} strokeWidth="2" {...line} />
      {glint(26, 30, 3)}
    </>
  ),
  squeegee: (
    <>
      <rect x="6" y="16" width="36" height="10" rx="3" fill={MINT} />
      <path d="M24 26 V43" stroke={TERRA} strokeWidth="4" {...line} />
      <path d="M10 20 H22" stroke={W} strokeWidth="2" {...line} />
      {glint(35, 21, 3)}
    </>
  ),
  cloth: (
    <>
      <path d="M7 13 Q24 6 41 13 Q46 26 41 37 Q24 44 7 37 Q2 26 7 13 Z" fill={PEACH} />
      <path d="M13 20 Q24 16 35 20" stroke={W} strokeWidth="2" strokeDasharray="2 4" {...line} />
      <path d="M13 31 Q24 35 35 31" stroke={TERRA} strokeWidth="2" strokeDasharray="2 4" {...line} />
      {glint(34, 15, 3)}
    </>
  ),
  sponge: (
    <>
      <rect x="6" y="14" width="36" height="22" rx="6" fill={PEACH} stroke={TERRA} strokeWidth="1.6" />
      <circle cx="15" cy="22" r="2" fill={W} fillOpacity="0.7" />
      <circle cx="27" cy="30" r="2" fill={W} fillOpacity="0.7" />
      <circle cx="35" cy="21" r="2" fill={W} fillOpacity="0.7" />
      {glint(12, 18, 3)}
    </>
  ),
  mop: (
    <>
      <path d="M31 5 L21 29" stroke={PEACH} strokeWidth="3.6" {...line} />
      <path d="M9 31 H31 L34 43 H7 Z" fill={TERRA} />
      <path d="M13 36 V43 M20 36 V43 M27 36 V43" stroke={W} strokeWidth="1.6" {...line} />
      {glint(16, 34, 2.6)}
    </>
  ),
  bucket: (
    <>
      <path d="M9 22 H39 L35 43 H13 Z" fill={TERRA} />
      <path d="M9 22 Q24 8 39 22" stroke={PEACH} strokeWidth="2.8" {...line} />
      <circle cx="17" cy="13" r="4" fill={PEACH} />
      <circle cx="28" cy="9" r="3" fill={MINT} />
      <circle cx="34" cy="16" r="2" fill={PEACH} />
      <path d="M15 28 V37" stroke={W} strokeWidth="2" {...line} />
      {glint(17, 12, 2)}
    </>
  ),
  bubbles: (
    <>
      <circle cx="16" cy="30" r="11" fill={PEACH} fillOpacity="0.55" stroke={TERRA} strokeWidth="2.4" />
      <circle cx="35" cy="13" r="6.5" fill={MINT} fillOpacity="0.5" stroke={MINT} strokeWidth="2.2" />
      <circle cx="37" cy="36" r="4" fill={PEACH} fillOpacity="0.6" stroke={PEACH} strokeWidth="2" />
      <path d="M10 26 Q11 22 15 21" stroke={W} strokeWidth="2.4" {...line} />
      <path d="M32 11 Q33 9 35 9" stroke={W} strokeWidth="2" {...line} />
    </>
  ),
  sparkle: (
    <>
      <path d="M24 3 Q26 22 45 24 Q26 26 24 45 Q22 26 3 24 Q22 22 24 3 Z" fill={GOLD} />
      {glint(22, 20, 3.4)}
    </>
  ),
  heart: (
    <>
      <path d="M24 42 C5 28 7 11 18 11 C22 11 24 14 24 16 C24 14 26 11 30 11 C41 11 43 28 24 42 Z" fill={PEACH} stroke={TERRA} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13 19 Q14 16 17 15" stroke={W} strokeWidth="2.4" {...line} />
      {glint(31, 21, 2.6)}
    </>
  ),
  leaf: (
    <>
      <path d="M8 40 C5 18 20 6 42 6 C42 27 31 42 8 40 Z" fill={MINT} />
      <path d="M9 39 L29 19" stroke={W} strokeWidth="2.2" {...line} />
      {glint(34, 14, 3)}
    </>
  ),
  shield: (
    <>
      <path d="M24 4 L41 11 V24 C41 34 33 41 24 45 C15 41 7 34 7 24 V11 Z" fill={MINT} />
      <path d="M16 24 L22 30 L33 18" stroke={W} strokeWidth="3.4" {...line} />
      {glint(14, 14, 2.6)}
    </>
  ),
  smiley: (
    <>
      <circle cx="24" cy="24" r="18" fill={PEACH} />
      <path d="M16 28 Q24 37 32 28" stroke={TERRA} strokeWidth="3" {...line} />
      <circle cx="18" cy="20" r="2" fill={TERRA} />
      <circle cx="30" cy="20" r="2" fill={TERRA} />
      {glint(14, 12, 3)}
    </>
  ),
  calendar: (
    <>
      <rect x="6" y="11" width="36" height="31" rx="6" fill={MINT} />
      <rect x="6" y="11" width="36" height="9" rx="4" fill={PEACH} />
      <path d="M16 6 V14 M32 6 V14" stroke={TERRA} strokeWidth="3.2" {...line} />
      <path d="M16 31 L22 37 L33 25" stroke={W} strokeWidth="3.4" {...line} />
      {glint(36, 25, 2.6)}
    </>
  ),
}

export type DecorKind = keyof typeof ICONS

export type DecorItem = {
  k: DecorKind
  /** Preferred anchor as a fraction (0-1) of the section; snapped to the nearest free spot */
  x: number
  y: number
  /** Set false to hide on mobile (default: shown) */
  m?: boolean
  size?: number
  rot?: number
  delay?: number
  /** Extra-soft variant (footer) */
  faint?: boolean
}

const CLEARANCE = 28
const ICON_GAP = 20
const STEP = 12

type Box = { l: number; t: number; r: number; b: number }

function collectBlockers(wrap: HTMLElement, host: HTMLElement, origin: DOMRect): Box[] {
  const hostArea = origin.width * origin.height
  const out: Box[] = []
  host.querySelectorAll<HTMLElement>('*').forEach((el) => {
    if (wrap.contains(el) || el instanceof SVGElement) return
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return
    let hit = ['IMG', 'BUTTON', 'A', 'INPUT', 'LI', 'H1', 'H2', 'H3', 'H4'].includes(el.tagName)
    if (!hit) hit = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '')
    if (!hit) {
      const cs = getComputedStyle(el)
      const bg = cs.backgroundColor
      const painted = (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') || cs.boxShadow !== 'none'
      hit = painted && r.width * r.height < hostArea * 0.6
    }
    if (!hit) return
    out.push({
      l: r.left - origin.left - CLEARANCE,
      t: r.top - origin.top - CLEARANCE,
      r: r.right - origin.left + CLEARANCE,
      b: r.bottom - origin.top + CLEARANCE,
    })
  })
  return out
}

const overlaps = (a: Box, b: Box) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t

/**
 * Decorations sit behind content. Each icon is snapped to the free spot nearest to its anchor
 * that keeps at least CLEARANCE px from any text, button, card or image; icons without a free
 * spot stay hidden.
 */
export default function Decor({ items }: { items: DecorItem[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef(items)

  useEffect(() => {
    const wrap = wrapRef.current
    const host = wrap?.parentElement
    if (!wrap || !host) return
    let frame = 0

    const place = () => {
      const origin = wrap.getBoundingClientRect()
      const W = origin.width
      const H = origin.height
      const blockers = collectBlockers(wrap, host, origin)
      const placed: Box[] = []
      const maxDist = W < 640 ? H : Math.min(360, Math.max(160, H * 0.3))
      const spans = Array.from(wrap.children) as HTMLElement[]

      itemsRef.current.forEach((it, i) => {
        const el = spans[i]
        if (!el) return
        const s = it.size ?? 48
        const pad = 4
        const visible = getComputedStyle(el).display !== 'none'
        let best: { x: number; y: number } | null = null
        if (visible && W > s + pad * 2 && H > s + pad * 2) {
          const ax = it.x * W - s / 2
          const ay = it.y * H - s / 2
          let bestD = maxDist * maxDist
          for (let y = pad; y <= H - s - pad; y += STEP) {
            for (let x = pad; x <= W - s - pad; x += STEP) {
              const d = (x - ax) ** 2 + (y - ay) ** 2
              if (d >= bestD) continue
              const box = { l: x, t: y, r: x + s, b: y + s }
              if (blockers.some((b) => overlaps(box, b))) continue
              const g = { l: box.l - ICON_GAP, t: box.t - ICON_GAP, r: box.r + ICON_GAP, b: box.b + ICON_GAP }
              if (placed.some((p) => overlaps(g, p))) continue
              bestD = d
              best = { x, y }
            }
          }
        }
        if (best) {
          el.style.left = `${best.x}px`
          el.style.top = `${best.y}px`
          el.style.visibility = 'visible'
          placed.push({ l: best.x, t: best.y, r: best.x + s, b: best.y + s })
        } else {
          el.style.visibility = 'hidden'
        }
      })
    }

    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(place)
    }

    schedule()
    const ro = new ResizeObserver(schedule)
    ro.observe(host)
    const mo = new MutationObserver(schedule)
    mo.observe(host, { childList: true, subtree: true, characterData: true })
    window.addEventListener('resize', schedule)
    const late = window.setTimeout(schedule, 600)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      mo.disconnect()
      window.removeEventListener('resize', schedule)
      window.clearTimeout(late)
    }
  }, [])

  return (
    <div ref={wrapRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {items.map((it, i) => (
        <span
          key={i}
          className={`kf-float absolute left-0 top-0 ${it.m === false ? 'hidden md:block' : 'block'}`}
          style={{
            visibility: 'hidden',
            animationDelay: `${it.delay ?? i * 1.7}s`,
            opacity: it.faint ? 0.35 : 0.6,
          }}
        >
          <svg
            viewBox="0 0 48 48"
            width={it.size ?? 48}
            height={it.size ?? 48}
            style={{ transform: `rotate(${it.rot ?? 0}deg)`, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.15))' }}
            aria-hidden="true"
            focusable="false"
          >
            {ICONS[it.k]}
          </svg>
        </span>
      ))}
    </div>
  )
}
