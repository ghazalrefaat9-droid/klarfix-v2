import type { CSSProperties } from 'react'
import type { LucideIcon, LucideProps } from 'lucide-react'

// Shared icon styles so every dashboard tile and top-bar button looks identical.

const iconStroke: Pick<LucideProps, 'strokeWidth' | 'strokeLinecap' | 'strokeLinejoin'> = {
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

// 56x56 tile, 16px radius, 24px icon. Background is the tile color at ~12% opacity (hex alpha 1F).
export function DashboardIcon({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return (
    <span
      aria-hidden
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px]"
      style={{ backgroundColor: `${color}1F`, color }}
    >
      <Icon size={24} {...iconStroke} />
    </span>
  )
}

// 44x44 white circle for all top-bar buttons (language, menu, messages, bell). overflow-visible keeps badges unclipped.
export const TOP_ICON_BUTTON =
  'relative flex h-11 w-11 shrink-0 items-center justify-center overflow-visible rounded-full border border-[#1A4D2E]/10 bg-[#FFFFFF] text-[#1A4D2E] shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A4D2E]/40'

export const TOP_ICON_PROPS = { size: 22, ...iconStroke } satisfies LucideProps

export function TopIcon({
  icon: Icon,
  className,
  style,
  strokeWidth,
}: {
  icon: LucideIcon
  className?: string
  style?: CSSProperties
  strokeWidth?: number
}) {
  return <Icon {...TOP_ICON_PROPS} strokeWidth={strokeWidth ?? TOP_ICON_PROPS.strokeWidth} className={className} style={style} aria-hidden="true" />
}

// 20x20 count badge pinned 2px outside the top-end corner of a relative parent.
export function CountBadge({ count, className = '' }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      className={`pointer-events-none absolute -end-0.5 -top-0.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold leading-none text-[#FFFFFF] shadow ring-2 ring-[#FFFFFF] ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
