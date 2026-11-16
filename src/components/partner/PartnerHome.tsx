'use client'

import { BarChart3, CheckCircle2, ClipboardList, Inbox, MessageCircle, Video, type LucideIcon } from 'lucide-react'
import { useLang } from '@/components/LanguageProvider'
import { DashboardIcon } from '@/components/IconBadge'
import type { PartnerCounts, PartnerView } from '@/lib/partnerViews'

function Tile({
  icon,
  label,
  color,
  count,
  onClick,
}: {
  icon: LucideIcon
  label: string
  color: string
  count?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex min-h-[120px] min-w-0 flex-col items-start rounded-[22px] bg-card p-3.5 text-start shadow-sm transition hover:-translate-y-1 sm:p-5"
    >
      {count !== undefined && count > 0 && (
        <span className="absolute end-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold leading-none text-[#FFFFFF]">
          {count > 99 ? '99+' : count}
        </span>
      )}
      <DashboardIcon icon={icon} color={color} />
      <span className="mt-3 line-clamp-2 break-words text-[13px] font-bold leading-[18px] text-primary sm:text-base sm:leading-[22px]">{label}</span>
    </button>
  )
}

// Start page: six cards plus the video call-to-action.
export default function PartnerHome({
  counts,
  unread,
  onSelect,
}: {
  counts: PartnerCounts | null
  unread: number
  onSelect: (v: PartnerView) => void
}) {
  const { t } = useLang()
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
        <Tile icon={Inbox} color="#E86A33" label={t('Neue Anfragen', 'طلبات جديدة', 'New requests')} count={counts?.neu} onClick={() => onSelect('neu')} />
        <Tile icon={ClipboardList} color="#14A090" label={t('Meine Aufträge', 'طلباتي', 'My jobs')} count={counts?.meine} onClick={() => onSelect('meine')} />
        <Tile icon={CheckCircle2} color="#2E9E5B" label={t('Abgeschlossene', 'المنجزة', 'Completed')} onClick={() => onSelect('abgeschlossen')} />
        <Tile icon={MessageCircle} color="#2A9DCC" label={t('Nachrichten', 'الرسائل', 'Messages')} count={unread} onClick={() => onSelect('nachrichten')} />
        <Tile icon={BarChart3} color="#8B5CF6" label={t('Meine Statistik', 'إحصائياتي', 'My statistics')} onClick={() => onSelect('statistik')} />
        <Tile icon={Video} color="#E85D5D" label={t('Video hochladen', 'رفع فيديو', 'Upload video')} onClick={() => onSelect('video')} />
      </div>

      <div className="rounded-2xl bg-[#FFC53D] p-5 text-center text-[#1B2A1F] shadow-sm">
        <p className="break-words text-lg font-bold">Noch kein Video? Deine Konkurrenz hat schon eins!</p>
        <button
          type="button"
          onClick={() => onSelect('video')}
          className="mt-3 min-h-[44px] max-w-full rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-card hover:bg-primary-hover"
        >
          🎥 Video hochladen &amp; mehr Aufträge bekommen
        </button>
      </div>
    </div>
  )
}
