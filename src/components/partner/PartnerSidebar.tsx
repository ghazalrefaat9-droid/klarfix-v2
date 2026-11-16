'use client'

import { useEffect, useState } from 'react'
import { BarChart3, CheckCircle2, ChevronDown, ClipboardList, Handshake, Inbox, LayoutDashboard, MessageCircle, Send, Sparkles, Video, X, type LucideIcon } from 'lucide-react'
import { useLang } from '@/components/LanguageProvider'

export const PARTNER_VIEWS = [
  'start',
  'video',
  'statistik',
  'neu',
  'meine',
  'meine-angebot',
  'meine-angenommen',
  'meine-erledigt',
  'abgeschlossen',
  'nachrichten',
] as const
export type PartnerView = (typeof PARTNER_VIEWS)[number]
export const isPartnerView = (v: string | null): v is PartnerView => !!v && (PARTNER_VIEWS as readonly string[]).includes(v)

export type PartnerCounts = { neu: number; meine: number; angebot: number; angenommen: number; erledigt: number; abgeschlossen: number }

function CountPill({ count, active }: { count: number; active: boolean }) {
  return (
    <span
      className={`ms-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none ${
        active ? 'bg-card text-primary' : 'bg-primary/10 text-primary'
      }`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

function Item({
  icon: Icon,
  label,
  count,
  alert,
  active,
  sub,
  onClick,
}: {
  icon: LucideIcon
  label: string
  count?: number
  alert?: boolean
  active: boolean
  sub?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-start text-sm font-semibold transition ${
        sub ? 'ps-9 text-[13px]' : ''
      } ${active ? 'bg-primary text-card' : 'text-primary hover:bg-primary/5'}`}
    >
      <Icon className={sub ? 'h-4 w-4 shrink-0' : 'h-5 w-5 shrink-0'} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined &&
        (alert && count > 0 ? (
          <span className="ms-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold leading-none text-[#FFFFFF]">
            {count > 99 ? '99+' : count}
          </span>
        ) : (
          <CountPill count={count} active={active} />
        ))}
    </button>
  )
}

function Menu({
  view,
  counts,
  unread,
  onSelect,
}: {
  view: PartnerView
  counts: PartnerCounts | null
  unread: number
  onSelect: (v: PartnerView) => void
}) {
  const { t } = useLang()
  const inMine = view.startsWith('meine')
  const [mineOpen, setMineOpen] = useState(inMine)
  const c = (k: keyof PartnerCounts) => (counts ? counts[k] : undefined)

  return (
    <nav aria-label={t('Partner-Menü', 'قائمة الشريك', 'Partner menu')} className="space-y-1">
      <Item icon={LayoutDashboard} label={t('Übersicht', 'نظرة عامة', 'Overview')} active={view === 'start'} onClick={() => onSelect('start')} />      <Item icon={BarChart3} label={t('Meine Statistik', 'إحصائياتي', 'My statistics')} active={view === 'statistik'} onClick={() => onSelect('statistik')} />
      <Item icon={Inbox} label={t('Neue Anfragen', 'طلبات جديدة', 'New requests')} count={c('neu')} active={view === 'neu'} onClick={() => onSelect('neu')} />

      <div>
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <Item
              icon={ClipboardList}
              label={t('Meine Aufträge', 'طلباتي', 'My jobs')}
              count={c('meine')}
              active={view === 'meine'}
              onClick={() => {
                setMineOpen(true)
                onSelect('meine')
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setMineOpen((o) => !o)}
            aria-expanded={mineOpen}
            aria-label={t('Untermenü Meine Aufträge', 'القائمة الفرعية لطلباتي', 'My jobs submenu')}
            className="flex h-11 w-9 shrink-0 items-center justify-center rounded-xl text-primary/70 hover:bg-primary/5"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${mineOpen ? 'rotate-180' : ''}`} aria-hidden />
          </button>
        </div>
        {mineOpen && (
          <div className="mt-1 space-y-1">
            <Item sub icon={Send} label={t('Angebot gesendet', 'تم إرسال العرض', 'Offer sent')} count={c('angebot')} active={view === 'meine-angebot'} onClick={() => onSelect('meine-angebot')} />
            <Item sub icon={Handshake} label={t('Kunde hat angenommen', 'وافق العميل', 'Customer accepted')} count={c('angenommen')} active={view === 'meine-angenommen'} onClick={() => onSelect('meine-angenommen')} />
            <Item sub icon={Sparkles} label={t('Auftrag erledigt', 'تم إنجاز الطلب', 'Job done')} count={c('erledigt')} active={view === 'meine-erledigt'} onClick={() => onSelect('meine-erledigt')} />
          </div>
        )}
      </div>

      <Item icon={CheckCircle2} label={t('Abgeschlossene Aufträge', 'الطلبات المنجزة', 'Completed jobs')} count={c('abgeschlossen')} active={view === 'abgeschlossen'} onClick={() => onSelect('abgeschlossen')} />
      <Item icon={MessageCircle} label={t('Nachrichten', 'الرسائل', 'Messages')} count={unread} alert active={view === 'nachrichten'} onClick={() => onSelect('nachrichten')} />
      <Item icon={Video} label={t('Video hochladen', 'رفع فيديو', 'Upload video')} active={view === 'video'} onClick={() => onSelect('video')} />
    </nav>
  )
}

// Desktop: sticky sidebar. Mobile: drawer opened by the ☰ button (drawerOpen is controlled by the page).
export default function PartnerSidebar({
  view,
  counts,
  unread,
  onSelect,
  drawerOpen,
  onCloseDrawer,
}: {
  view: PartnerView
  counts: PartnerCounts | null
  unread: number
  onSelect: (v: PartnerView) => void
  drawerOpen: boolean
  onCloseDrawer: () => void
}) {
  const { t } = useLang()

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseDrawer()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen, onCloseDrawer])

  const menu = <Menu view={view} counts={counts} unread={unread} onSelect={onSelect} />

  return (
    <>
      <aside className="hidden md:block">
        <div className="sticky top-24 rounded-2xl bg-card p-3 shadow-sm">{menu}</div>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={t('Partner-Menü', 'قائمة الشريك', 'Partner menu')}>
          <div className="absolute inset-0 bg-primary/50" onClick={onCloseDrawer} />
          <div className="absolute inset-y-0 start-0 flex w-[min(20rem,85vw)] flex-col overflow-y-auto bg-background p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-bold text-primary">{t('Menü', 'القائمة', 'Menu')}</p>
              <button
                type="button"
                onClick={onCloseDrawer}
                aria-label={t('Schließen', 'إغلاق', 'Close')}
                className="flex h-11 w-11 items-center justify-center rounded-full text-primary/70 hover:bg-primary/5"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {menu}
          </div>
        </div>
      )}
    </>
  )
}
