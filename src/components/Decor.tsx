import type { ReactNode } from 'react'

const SAGE = '#8FA68E'
const GREY = '#9AA39B'
const TERRA = '#C67A4A'
const SPARK = '#F2C94C'

const S = { fill: 'none', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const ICONS: Record<string, ReactNode> = {
  vacuum: (
    <>
      <circle cx="14" cy="36" r="6" stroke={SAGE} {...S} />
      <path d="M14 30 L22 12 L30 12" stroke={GREY} {...S} />
      <path d="M26 38 H42 L40 31 H28 Z" stroke={SAGE} {...S} />
      <path d="M22 12 L30 31" stroke={GREY} {...S} />
    </>
  ),
  spray: (
    <>
      <rect x="14" y="20" width="16" height="22" rx="4" stroke={SAGE} {...S} />
      <path d="M18 20 V14 H30 L34 17" stroke={TERRA} {...S} />
      <path d="M38 12 H41 M38 17 H42 M38 22 H41" stroke={GREY} {...S} />
      <path d="M14 30 H30" stroke={GREY} {...S} />
    </>
  ),
  squeegee: (
    <>
      <path d="M8 18 H40 V26 H8 Z" stroke={SAGE} {...S} />
      <path d="M24 26 V42" stroke={GREY} {...S} />
      <path d="M8 22 H40" stroke={GREY} {...S} />
    </>
  ),
  cloth: (
    <>
      <path d="M8 14 Q24 8 40 14 Q44 26 40 36 Q24 42 8 36 Q4 26 8 14 Z" stroke={SAGE} {...S} />
      <path d="M13 20 Q24 16 35 20 M13 30 Q24 34 35 30" stroke={TERRA} strokeDasharray="2 4" {...S} />
    </>
  ),
  sponge: (
    <>
      <rect x="8" y="16" width="32" height="20" rx="5" stroke={SAGE} {...S} />
      <path d="M8 26 H40" stroke={GREY} {...S} />
      <circle cx="16" cy="21" r="1.6" stroke={GREY} {...S} />
      <circle cx="26" cy="31" r="1.6" stroke={GREY} {...S} />
      <circle cx="33" cy="21" r="1.6" stroke={GREY} {...S} />
    </>
  ),
  mop: (
    <>
      <path d="M30 6 L20 30" stroke={GREY} {...S} />
      <path d="M10 32 H30 L32 42 H8 Z" stroke={SAGE} {...S} />
      <path d="M14 36 V42 M20 36 V42 M26 36 V42" stroke={GREY} {...S} />
    </>
  ),
  bucket: (
    <>
      <path d="M10 22 H38 L35 42 H13 Z" stroke={SAGE} {...S} />
      <path d="M10 22 Q24 8 38 22" stroke={GREY} {...S} />
      <circle cx="18" cy="12" r="3" stroke={GREY} {...S} />
      <circle cx="28" cy="9" r="2.2" stroke={SAGE} {...S} />
      <circle cx="33" cy="15" r="1.6" stroke={GREY} {...S} />
    </>
  ),
  bubbles: (
    <>
      <circle cx="16" cy="30" r="10" stroke={SAGE} {...S} />
      <circle cx="35" cy="14" r="6" stroke={GREY} {...S} />
      <circle cx="36" cy="36" r="3.5" stroke={SAGE} {...S} />
      <path d="M11 27 Q12 23 16 22" stroke={GREY} {...S} />
    </>
  ),
  sparkle: (
    <path d="M24 6 Q25 22 42 24 Q25 26 24 42 Q23 26 6 24 Q23 22 24 6 Z" fill={SPARK} stroke="none" />
  ),
  heart: (
    <path d="M24 40 C8 28 8 14 18 14 C22 14 24 17 24 19 C24 17 26 14 30 14 C40 14 40 28 24 40 Z" stroke={TERRA} {...S} />
  ),
  leaf: (
    <>
      <path d="M10 38 C8 18 22 8 40 8 C40 26 30 40 10 38 Z" stroke={SAGE} {...S} />
      <path d="M10 38 L28 20" stroke={GREY} {...S} />
    </>
  ),
  shield: (
    <>
      <path d="M24 6 L39 12 V24 C39 33 32 39 24 42 C16 39 9 33 9 24 V12 Z" stroke={SAGE} {...S} />
      <path d="M17 24 L22 29 L31 19" stroke={GREY} {...S} />
    </>
  ),
  smiley: (
    <>
      <circle cx="24" cy="24" r="16" stroke={SAGE} {...S} />
      <path d="M17 28 Q24 35 31 28" stroke={TERRA} {...S} />
    </>
  ),
  calendar: (
    <>
      <rect x="8" y="12" width="32" height="28" rx="5" stroke={SAGE} {...S} />
      <path d="M8 21 H40 M17 8 V15 M31 8 V15" stroke={GREY} {...S} />
      <path d="M18 30 L22 34 L30 26" stroke={TERRA} {...S} />
    </>
  ),
}

export type DecorKind = keyof typeof ICONS

export type DecorItem = {
  k: DecorKind
  /** Tailwind position classes, e.g. "left-[4%] top-[10%]" */
  pos: string
  /** Show on mobile too (only a small share of items should) */
  m?: boolean
  size?: number
  rot?: number
  delay?: number
  /** Light variant for dark backgrounds */
  faint?: boolean
}

export default function Decor({ items }: { items: DecorItem[] }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {items.map((it, i) => (
        <span
          key={i}
          className={`kf-float absolute ${it.m ? 'block' : 'hidden md:block'} ${it.pos}`}
          style={{ animationDelay: `${it.delay ?? i * 1.7}s`, opacity: it.faint ? 0.2 : it.k === 'sparkle' ? 0.4 : 0.35 }}
        >
          <svg
            viewBox="0 0 48 48"
            width={it.size ?? 40}
            height={it.size ?? 40}
            style={{ transform: `rotate(${it.rot ?? 0}deg)` }}
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
