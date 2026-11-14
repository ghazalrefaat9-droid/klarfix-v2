'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { callApi as requestApi } from '@/lib/apiClient'
import { CLEANING_TYPES } from '@/lib/applications'
import ChatBox, { type ChatLabels } from '@/components/ChatBox'
import { LocationTag, SearchFeedback, SearchInput, useDebounced } from '@/components/admin/PartnerSearch'
import { regionOf } from '@/lib/regions'
import { firstPostcodeToken, matchesSearch, suggestRegions, tokenize, type SearchFields } from '@/lib/partnerSearch'

export type PartnerView = 'active' | 'blocked' | 'trash'

export type AdminPartner = {
  id: string
  company_name: string
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  street: string | null
  city: string | null
  postcode: string | null
  legal_form: string | null
  employee_count: string | null
  has_liability_insurance: boolean | null
  has_trade_license: boolean | null
  experience_years: number | null
  services: string[] | null
  description: string | null
  website: string | null
  languages: string[] | null
  availability: string | null
  terms_accepted_at: string | null
  logo_url: string | null
  license_url: string | null
  insurance_url: string | null
  hourly_rate: number | null
  verified: boolean
  is_blocked: boolean
  blocked_at: string | null
  blocked_reason: string | null
  deleted_at: string | null
  deleted_reason: string | null
  created_at: string
}

const LEGAL_FORMS = ['Einzelunternehmen', 'GbR', 'UG (haftungsbeschränkt)', 'GmbH', 'Sonstige']
const SERVICE_OPTIONS: string[] = CLEANING_TYPES.map((c) => c.label)

const VIEW_TITLES: Record<PartnerView, string> = {
  active: 'Partner verwalten',
  blocked: 'Blockierte Partner',
  trash: 'Papierkorb – Partner',
}

const inputClass =
  'mt-1 min-h-[44px] w-full rounded-xl border border-[#1A4D2E]/15 bg-[#FFFFFF] px-3 py-2 text-sm text-[#1A4D2E] focus:border-[#1A4D2E] focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/15'

const actionButton =
  'flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#F5F5F0] py-2.5 text-[12px] font-medium text-[#1A4D2E] transition hover:bg-[#ECECE4] disabled:opacity-50'

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString('de-DE') : '–')

const partnerFields = (p: AdminPartner): SearchFields => ({
  names: [p.company_name, p.first_name, p.last_name],
  city: p.city,
  postcode: p.postcode,
})

async function callApi(path: string, method: 'PUT' | 'DELETE' | 'POST', body?: unknown) {
  const { ok, data } = await requestApi<{ warning?: string; emailSent?: boolean }>('admin', path, method, body)
  return { error: ok ? null : (data?.error ?? 'Aktion fehlgeschlagen.'), data }
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-[#0F2A1D]/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-[24px] bg-[#FFFAF5] p-6 shadow-2xl sm:max-w-md sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-[#1A4D2E]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#1A4D2E]/70 hover:bg-[#1A4D2E]/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ModalButtons({
  onCancel,
  confirmLabel,
  danger,
  busy,
  onConfirm,
}: {
  onCancel: () => void
  confirmLabel: string
  danger?: boolean
  busy: boolean
  onConfirm?: () => void
}) {
  return (
    <div className="mt-6 flex gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="min-h-[44px] flex-1 rounded-xl bg-[#F5F5F0] py-3 text-sm font-medium text-[#1A4D2E] hover:bg-[#ECECE4]"
      >
        Abbrechen
      </button>
      <button
        type={onConfirm ? 'button' : 'submit'}
        onClick={onConfirm}
        disabled={busy}
        className={`min-h-[44px] flex-1 rounded-xl py-3 text-sm font-bold text-[#FFFFFF] disabled:opacity-60 ${
          danger ? 'bg-danger hover:bg-danger-hover' : 'bg-[#1A4D2E] hover:bg-[#143D24]'
        }`}
      >
        {busy ? 'Bitte warten…' : confirmLabel}
      </button>
    </div>
  )
}

type EditForm = {
  company_name: string
  city: string
  phone: string
  hourly_rate: string
  services: string[]
  legal_form: string
  verified: boolean
}

function EditDialog({ partner, busy, onClose, onSave }: { partner: AdminPartner; busy: boolean; onClose: () => void; onSave: (form: EditForm) => void }) {
  const [form, setForm] = useState<EditForm>({
    company_name: partner.company_name,
    city: partner.city ?? '',
    phone: partner.phone ?? '',
    hourly_rate: partner.hourly_rate !== null ? String(partner.hourly_rate) : '',
    services: partner.services ?? [],
    legal_form: partner.legal_form ?? '',
    verified: partner.verified,
  })
  const set = <K extends keyof EditForm>(key: K, value: EditForm[K]) => setForm((prev) => ({ ...prev, [key]: value }))
  const serviceOptions = [...SERVICE_OPTIONS, ...(partner.services ?? []).filter((s) => !SERVICE_OPTIONS.includes(s))]
  const legalForms = partner.legal_form && !LEGAL_FORMS.includes(partner.legal_form) ? [...LEGAL_FORMS, partner.legal_form] : LEGAL_FORMS

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onSave(form)
  }

  return (
    <Modal title="Partner bearbeiten" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 text-[#1A4D2E]">
        <label className="block text-sm font-medium">
          Firmenname *
          <input required value={form.company_name} onChange={(e) => set('company_name', e.target.value)} className={inputClass} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Stadt
            <input value={form.city} onChange={(e) => set('city', e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm font-medium">
            Telefon
            <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm font-medium">
            Preis (€/Std.)
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={999}
              step="0.5"
              value={form.hourly_rate}
              onChange={(e) => set('hourly_rate', e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium">
            Rechtsform
            <select value={form.legal_form} onChange={(e) => set('legal_form', e.target.value)} className={inputClass}>
              <option value="">–</option>
              {legalForms.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium">
          Status
          <select
            value={form.verified ? 'verified' : 'pending'}
            onChange={(e) => set('verified', e.target.value === 'verified')}
            className={inputClass}
          >
            <option value="verified">Verifiziert</option>
            <option value="pending">Ausstehend</option>
          </select>
          <span className="mt-1 block text-xs text-[#4B5563]">Hier wird keine Annahme-E-Mail gesendet – dafür „Verifizieren“ auf der Karte nutzen.</span>
        </label>
        <fieldset>
          <legend className="text-sm font-medium">Leistungen</legend>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            {serviceOptions.map((s) => (
              <label key={s} className="flex min-h-[36px] items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.services.includes(s)}
                  onChange={(e) => set('services', e.target.checked ? [...form.services, s] : form.services.filter((x) => x !== s))}
                  className="h-4 w-4"
                />
                {s}
              </label>
            ))}
          </div>
        </fieldset>
        <ModalButtons onCancel={onClose} confirmLabel="Speichern" busy={busy} />
      </form>
    </Modal>
  )
}

function BlockDialog({ partner, busy, onClose, onConfirm }: { partner: AdminPartner; busy: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  return (
    <Modal title="Partner blockieren?" onClose={onClose}>
      <p className="text-sm text-[#4B5563]">
        <span className="font-semibold text-[#1A4D2E]">{partner.company_name}</span> kann sich danach nicht mehr anmelden und
        erscheint nicht mehr bei der Partner-Zuweisung.
      </p>
      <label className="mt-4 block text-sm font-medium text-[#1A4D2E]">
        Grund (optional)
        <textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
      </label>
      <ModalButtons onCancel={onClose} confirmLabel="Blockieren" danger busy={busy} onConfirm={() => onConfirm(reason)} />
    </Modal>
  )
}

type Dialog =
  | { kind: 'edit'; partner: AdminPartner }
  | { kind: 'block'; partner: AdminPartner }
  | { kind: 'trash'; partner: AdminPartner }
  | { kind: 'hardDelete'; partner: AdminPartner }
  | { kind: 'chat'; partner: AdminPartner }

const ADMIN_CHAT_LABELS: ChatLabels = {
  placeholder: 'Nachricht schreiben… (Enter = senden, Umschalt+Enter = neue Zeile)',
  send: 'Senden',
  empty: 'Noch keine Nachrichten. Schreiben Sie die erste!',
  loadError: 'Nachrichten konnten nicht geladen werden.',
  sendError: 'Nachricht konnte nicht gesendet werden.',
  otherName: 'Partner',
}

function PartnerCard({
  partner: p,
  view,
  busy,
  unread = 0,
  onOpen,
  onChat,
  onVerify,
  onEdit,
  onBlock,
  onUnblock,
  onTrash,
  onRestore,
  onHardDelete,
}: {
  partner: AdminPartner
  view: PartnerView
  busy: boolean
  unread?: number
  onOpen?: () => void
  onChat: () => void
  onVerify: () => void
  onEdit: () => void
  onBlock: () => void
  onUnblock: () => void
  onTrash: () => void
  onRestore: () => void
  onHardDelete: () => void
}) {
  const initial = (p.company_name.trim()[0] ?? '?').toUpperCase()

  return (
    <li className="min-w-0 rounded-[20px] bg-[#FFFFFF] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
      <div
        className={`flex gap-3 ${onOpen ? 'cursor-pointer' : ''}`}
        onClick={onOpen}
        role={onOpen ? 'button' : undefined}
        tabIndex={onOpen ? 0 : undefined}
        onKeyDown={(e) => onOpen && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8FBC8F] text-base font-bold text-[#FFFFFF]">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="max-w-full truncate font-bold text-[#1A4D2E]">{p.company_name}</h3>
            {p.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-semibold text-[#166534]">
                <ShieldCheck className="h-3.5 w-3.5" /> Verifiziert
              </span>
            ) : (
              <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#92400E]">Ausstehend</span>
            )}
            {p.hourly_rate !== null && (
              <span className="rounded-full bg-[#F5F5F0] px-2 py-0.5 text-[11px] font-medium text-[#4B5563]">{p.hourly_rate} €/Std.</span>
            )}
          </div>
          <div className="mt-1.5 space-y-1 text-[13px] text-[#4B5563]">
            <p className="flex min-w-0 items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0" size={14} />
              <span className="truncate">{p.email}</span>
            </p>
            {p.phone && (
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0" size={14} />
                <span className="truncate">{p.phone}</span>
              </p>
            )}
            <p className="flex min-w-0 items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" size={14} />
              <LocationTag city={p.city} postcode={p.postcode} />
            </p>
          </div>
        </div>
      </div>

      {view === 'blocked' && (
        <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">
          Blockiert am {formatDate(p.blocked_at)}
          {p.blocked_reason ? ` – ${p.blocked_reason}` : ''}
        </p>
      )}
      {view === 'trash' && (
        <p className="mt-3 rounded-xl bg-[#F5F5F0] px-3 py-2 text-xs text-[#4B5563]">
          Gelöscht am {formatDate(p.deleted_at)}
          {p.deleted_reason ? ` – ${p.deleted_reason}` : ''}
        </p>
      )}

      {view === 'active' && !p.verified && (
        <button
          type="button"
          onClick={onVerify}
          disabled={busy}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#1A4D2E] text-[13px] font-semibold text-[#FFFFFF] hover:bg-[#143D24] disabled:opacity-60"
        >
          <ShieldCheck className="h-4 w-4" /> Verifizieren & Annahme-E-Mail senden
        </button>
      )}

      {view === 'active' && p.verified && (
        <button
          type="button"
          onClick={onChat}
          className="relative mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#1A4D2E] text-[13px] font-semibold text-[#FFFFFF] hover:bg-[#143D24]"
        >
          <MessageCircle className="h-4 w-4" /> Chat
          {unread > 0 && (
            <span className="ms-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-[#FFFFFF]">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      )}

      {view === 'trash' ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onRestore} disabled={busy} className={actionButton}>
            <RotateCcw className="h-4 w-4" /> Wiederherstellen
          </button>
          <button type="button" onClick={onHardDelete} disabled={busy} className={`${actionButton} text-danger`}>
            <Trash2 className="h-4 w-4" /> Endgültig löschen
          </button>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button type="button" onClick={onEdit} disabled={busy} className={actionButton}>
            <Pencil className="h-4 w-4" /> Bearbeiten
          </button>
          {view === 'blocked' ? (
            <button type="button" onClick={onUnblock} disabled={busy} className={actionButton}>
              <CheckCircle className="h-4 w-4" /> Entsperren
            </button>
          ) : (
            <button type="button" onClick={onBlock} disabled={busy} className={actionButton}>
              <Ban className="h-4 w-4" /> Blockieren
            </button>
          )}
          <button type="button" onClick={onTrash} disabled={busy} className={`${actionButton} text-danger`}>
            <Trash2 className="h-4 w-4" /> Papierkorb
          </button>
        </div>
      )}
    </li>
  )
}

// Card list with one search field (company, city, postcode). Shows one fixed view: active partners in the dashboard
// "Partner" tab; blocked and trashed partners are only reached via the "Blockiert" / "Papierkorb" cards at the top.
export function PartnerList({
  initialView = 'active',
  reloadKey = 0,
  onOpenDetails,
  onChanged,
}: {
  initialView?: PartnerView
  reloadKey?: number
  onOpenDetails?: (partner: AdminPartner) => void
  onChanged?: () => void
}) {
  const view = initialView
  const [partners, setPartners] = useState<AdminPartner[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [dialogError, setDialogError] = useState('')
  const [busy, setBusy] = useState(false)
  const [unread, setUnread] = useState<Record<string, number>>({})

  const loadUnread = useCallback(async () => {
    const { ok, data } = await requestApi<{ byPartner: Record<string, number> }>('admin', '/api/admin/messages')
    if (ok && data?.byPartner) setUnread(data.byPartner)
  }, [])

  // Keep the chat badges fresh while the list is open.
  useEffect(() => {
    const init = async () => {
      await loadUnread()
    }
    init()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') loadUnread()
    }, 30000)
    return () => clearInterval(timer)
  }, [loadUnread])

  const load = useCallback(async () => {
    const { ok, data } = await requestApi<{ partners: AdminPartner[] }>('admin', `/api/admin/partners?view=${view}`)
    if (!ok) setMessage(data?.error ?? 'Partner konnten nicht geladen werden.')
    setPartners(data?.partners ?? [])
    setLoading(false)
  }, [view])

  useEffect(() => {
    const init = async () => {
      await load()
    }
    init()
  }, [load, reloadKey])

  const query = useDebounced(search, 200)
  const tokens = useMemo(() => tokenize(query), [query])

  const visible = useMemo(() => partners.filter((p) => matchesSearch(partnerFields(p), tokens)), [partners, tokens])
  // "Meintest du": cities where the query matches or that are close to a typo; picking one searches for that city.
  const suggestions = useMemo(
    () => (tokens.length && visible.length === 0 ? suggestRegions(partners, tokens, partnerFields, (p) => regionOf(p.postcode, p.city)) : []),
    [tokens, visible.length, partners],
  )
  const pickSuggestion = (key: string) => setSearch(suggestions.find((s) => s.key === key)?.label ?? '')

  const openDialog = (d: Dialog) => {
    setDialogError('')
    setDialog(d)
  }

  type ApiResult = Awaited<ReturnType<typeof callApi>>

  async function run(action: () => Promise<ApiResult>, success: string | ((result: ApiResult) => string)) {
    setBusy(true)
    setMessage('')
    setDialogError('')
    const result = await action()
    setBusy(false)
    if (result.error) {
      if (dialog) setDialogError(result.error)
      else setMessage(result.error)
      return
    }
    setDialog(null)
    setMessage(typeof success === 'string' ? success : success(result))
    await load()
    onChanged?.()
  }

  const base = (id: string) => `/api/admin/partners/${id}`
  const save = (p: AdminPartner, f: EditForm) =>
    run(() => callApi(base(p.id), 'PUT', { ...f, hourly_rate: f.hourly_rate === '' ? null : Number(f.hourly_rate) }), 'Änderungen gespeichert.')
  const block = (p: AdminPartner, reason: string) => run(() => callApi(`${base(p.id)}/block`, 'PUT', { blocked: true, reason }), 'Partner blockiert.')
  const unblock = (p: AdminPartner) => run(() => callApi(`${base(p.id)}/block`, 'PUT', { blocked: false }), 'Partner entsperrt.')
  const trash = (p: AdminPartner) => run(() => callApi(`${base(p.id)}/trash`, 'PUT', {}), 'In den Papierkorb verschoben.')
  const restore = (p: AdminPartner) => run(() => callApi(`${base(p.id)}/restore`, 'PUT'), 'Partner wiederhergestellt.')
  const hardDelete = (p: AdminPartner) =>
    run(() => callApi(base(p.id), 'DELETE'), 'Partner endgültig gelöscht. Die E-Mail kann sich jetzt neu bewerben.')
  const verify = (p: AdminPartner) =>
    run(
      () => callApi('/api/admin/verify-partner', 'POST', { partnerId: p.id }),
      (r) => (r.data?.emailSent ? 'Partner verifiziert. Annahme-E-Mail wurde gesendet.' : (r.data?.warning ?? 'Partner verifiziert.')),
    )

  return (
    <div>
      <SearchInput value={search} onChange={setSearch} label="Partner suchen nach Firma, Stadt oder PLZ" />

      {message && <p className="mt-3 rounded-xl bg-[#FFFFFF] p-3 text-sm text-[#1A4D2E] shadow-[0_2px_10px_rgba(0,0,0,0.05)]">{message}</p>}

      {loading ? (
        <p className="mt-6 text-center text-sm text-[#4B5563]">Lade…</p>
      ) : visible.length === 0 && query.trim() ? (
        <div className="mt-4">
          <SearchFeedback
            query={query}
            count={0}
            suggestions={suggestions}
            onPick={pickSuggestion}
            postcode={firstPostcodeToken(tokens)}
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-[20px] bg-[#FFFAF5] px-6 py-10 text-center shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#A8D5A2]/50 text-[#1A4D2E]">
            <Users className="h-6 w-6" />
          </div>
          <p className="mt-3 font-semibold text-[#1A4D2E]">
            {view === 'trash'
              ? 'Keine Partner im Papierkorb'
              : view === 'blocked'
                ? 'Keine blockierten Partner'
                : 'Keine aktiven Partner'}
          </p>
          <p className="mt-1 text-[13px] text-[#4B5563]">Hier erscheinen Partner, sobald es welche gibt.</p>
        </div>
      ) : (
        <>
        {query.trim() && (
          <div className="mt-3">
            <SearchFeedback query={query} count={visible.length} suggestions={[]} onPick={pickSuggestion} postcode={null} />
          </div>
        )}
        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {visible.map((p) => (
            <PartnerCard
              key={p.id}
              partner={p}
              view={view}
              busy={busy}
              unread={unread[p.id] ?? 0}
              onOpen={onOpenDetails ? () => onOpenDetails(p) : undefined}
              onChat={() => openDialog({ kind: 'chat', partner: p })}
              onVerify={() => verify(p)}
              onEdit={() => openDialog({ kind: 'edit', partner: p })}
              onBlock={() => openDialog({ kind: 'block', partner: p })}
              onUnblock={() => unblock(p)}
              onTrash={() => openDialog({ kind: 'trash', partner: p })}
              onRestore={() => restore(p)}
              onHardDelete={() => openDialog({ kind: 'hardDelete', partner: p })}
            />
          ))}
        </ul>
        </>
      )}

      {dialog?.kind === 'edit' && (
        <EditDialog partner={dialog.partner} busy={busy} onClose={() => setDialog(null)} onSave={(f) => save(dialog.partner, f)} />
      )}
      {dialog?.kind === 'block' && (
        <BlockDialog partner={dialog.partner} busy={busy} onClose={() => setDialog(null)} onConfirm={(r) => block(dialog.partner, r)} />
      )}
      {dialog?.kind === 'trash' && (
        <Modal title="In Papierkorb verschieben?" onClose={() => setDialog(null)}>
          <p className="text-sm text-[#4B5563]">
            <span className="font-semibold text-[#1A4D2E]">{dialog.partner.company_name}</span> wird in den Papierkorb verschoben und
            kann dort wiederhergestellt werden.
          </p>
          <ModalButtons onCancel={() => setDialog(null)} confirmLabel="Verschieben" danger busy={busy} onConfirm={() => trash(dialog.partner)} />
        </Modal>
      )}
      {dialog?.kind === 'chat' && (
        <Modal
          title={`Chat mit ${dialog.partner.company_name}`}
          onClose={() => {
            setDialog(null)
            loadUnread()
          }}
        >
          <ChatBox me="admin" endpoint={`/api/admin/partners/${dialog.partner.id}/messages`} labels={ADMIN_CHAT_LABELS} />
        </Modal>
      )}
      {dialog?.kind === 'hardDelete' && (
        <Modal title="Endgültig löschen?" onClose={() => setDialog(null)}>
          <p className="text-sm text-[#4B5563]">
            <span className="font-semibold text-[#1A4D2E]">{dialog.partner.company_name}</span> ({dialog.partner.email}) wird
            vollständig aus der Datenbank entfernt. Das kann nicht rückgängig gemacht werden. Zugewiesene Anfragen werden wieder
            freigegeben.
          </p>
          <ModalButtons
            onCancel={() => setDialog(null)}
            confirmLabel="Endgültig löschen"
            danger
            busy={busy}
            onConfirm={() => hardDelete(dialog.partner)}
          />
        </Modal>
      )}
      {dialog && dialogError && (
        <p role="alert" className="fixed inset-x-4 top-4 z-[10000] mx-auto max-w-md rounded-xl bg-danger p-3 text-center text-sm font-medium text-[#FFFFFF] shadow-lg">
          {dialogError}
        </p>
      )}
    </div>
  )
}

// Standalone pages /admin/partners, /admin/partners/blocked, /admin/partners/trash.
export default function PartnersManager({ view }: { view: PartnerView }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const init = async () => {
      if (!localStorage.getItem('admin')) {
        router.replace('/admin/login')
        return
      }
      setReady(true)
    }
    init()
  }, [router])

  if (!ready) return <div className="min-h-screen bg-[#E6F1E6] p-8 text-center text-[#4B5563]">Lade…</div>

  return (
    <div className="min-h-screen bg-[#E6F1E6]">
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <div className="mb-5 flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            aria-label="Zurück zum Dashboard"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFFFFF] text-[#1A4D2E] shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:bg-[#F5F5F0]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-[#1A4D2E]">{VIEW_TITLES[view]}</h1>
        </div>
        <PartnerList initialView={view} />
      </main>
    </div>
  )
}
