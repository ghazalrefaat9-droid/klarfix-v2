'use client'

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreVertical, X } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { CLEANING_TYPES } from '@/lib/applications'

export type PartnerView = 'active' | 'blocked' | 'trash'

type Partner = {
  id: string
  company_name: string
  email: string
  phone: string | null
  city: string | null
  services: string[] | null
  legal_form: string | null
  hourly_rate: number | null
  verified: boolean
  is_blocked: boolean
  blocked_at: string | null
  blocked_reason: string | null
  deleted_at: string | null
  deleted_reason: string | null
  created_at: string
}

const COLUMNS =
  'id, company_name, email, phone, city, services, legal_form, hourly_rate, verified, is_blocked, blocked_at, blocked_reason, deleted_at, deleted_reason, created_at'

const LEGAL_FORMS = ['Einzelunternehmen', 'GbR', 'UG (haftungsbeschränkt)', 'GmbH', 'Sonstige']
const SERVICE_OPTIONS: string[] = CLEANING_TYPES.map((c) => c.label)

const VIEWS: { key: PartnerView; label: string; title: string; href: string }[] = [
  { key: 'active', label: 'Aktiv', title: 'Partner', href: '/admin/partners' },
  { key: 'blocked', label: 'Blockiert', title: 'Blockierte Partner', href: '/admin/partners/blocked' },
  { key: 'trash', label: 'Papierkorb', title: 'Papierkorb', href: '/admin/partners/trash' },
]

const inputClass =
  'mt-1 w-full rounded-lg border border-primary/20 bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString('de-DE') : '–')

function query(view: PartnerView) {
  const base = supabase.from('partners')
  if (view === 'trash') return base.select(COLUMNS).not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
  return base
    .select(COLUMNS)
    .is('deleted_at', null)
    .eq('is_blocked', view === 'blocked')
    .order(view === 'blocked' ? 'blocked_at' : 'created_at', { ascending: false })
}

function countQuery(view: PartnerView) {
  const base = supabase.from('partners').select('id', { count: 'exact', head: true })
  if (view === 'trash') return base.not('deleted_at', 'is', null)
  return base.is('deleted_at', null).eq('is_blocked', view === 'blocked')
}

async function callApi(path: string, method: 'PUT' | 'DELETE', body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null)
  const data = (await res?.json().catch(() => null)) as { error?: string } | null
  return res?.ok ? null : (data?.error ?? 'Aktion fehlgeschlagen.')
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-primary/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-primary">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Schließen" className="rounded-lg p-1 text-primary/70 hover:bg-primary/5">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalButtons({
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
        className="flex-1 rounded-xl bg-primary/10 py-3 text-sm font-medium text-primary hover:bg-primary/15"
      >
        Abbrechen
      </button>
      <button
        type={onConfirm ? 'button' : 'submit'}
        onClick={onConfirm}
        disabled={busy}
        className={`flex-1 rounded-xl py-3 text-sm font-bold text-card disabled:opacity-60 ${
          danger ? 'bg-danger hover:bg-danger-hover' : 'bg-primary hover:bg-primary-hover'
        }`}
      >
        {busy ? 'Bitte warten…' : confirmLabel}
      </button>
    </div>
  )
}

type Dialog =
  | { kind: 'edit'; partner: Partner }
  | { kind: 'block'; partner: Partner }
  | { kind: 'trash'; partner: Partner }
  | { kind: 'hardDelete'; partner: Partner }

type EditForm = {
  company_name: string
  city: string
  phone: string
  hourly_rate: string
  services: string[]
  legal_form: string
  verified: boolean
}

function EditDialog({ partner, busy, onClose, onSave }: { partner: Partner; busy: boolean; onClose: () => void; onSave: (form: EditForm) => void }) {
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
      <form onSubmit={submit} className="space-y-4">
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
          <span className="mt-1 block text-xs text-primary/60">Hinweis: Hier wird keine Annahme-E-Mail gesendet (dafür „Verify“ im Dashboard).</span>
        </label>
        <fieldset>
          <legend className="text-sm font-medium">Leistungen</legend>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {serviceOptions.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.services.includes(s)}
                  onChange={(e) => set('services', e.target.checked ? [...form.services, s] : form.services.filter((x) => x !== s))}
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

function BlockDialog({ partner, busy, onClose, onConfirm }: { partner: Partner; busy: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  return (
    <Modal title="Partner blockieren?" onClose={onClose}>
      <p className="text-sm text-primary/75">
        <span className="font-semibold text-primary">{partner.company_name}</span> kann sich danach nicht mehr anmelden und
        erscheint nicht mehr bei der Partner-Zuweisung.
      </p>
      <label className="mt-4 block text-sm font-medium">
        Grund (optional)
        <textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
      </label>
      <ModalButtons onCancel={onClose} confirmLabel="Blockieren" danger busy={busy} onConfirm={() => onConfirm(reason)} />
    </Modal>
  )
}

export default function PartnersManager({ view }: { view: PartnerView }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [partners, setPartners] = useState<Partner[]>([])
  const [counts, setCounts] = useState<Record<PartnerView, number>>({ active: 0, blocked: 0, trash: 0 })
  const [message, setMessage] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [dialogError, setDialogError] = useState('')
  const [busy, setBusy] = useState(false)

  const openDialog = (d: Dialog) => {
    setDialogError('')
    setDialog(d)
  }

  const load = useCallback(async () => {
    const [list, active, blocked, trash] = await Promise.all([query(view), countQuery('active'), countQuery('blocked'), countQuery('trash')])
    if (list.error) setMessage('Partner konnten nicht geladen werden. Wurde partner_block_trash.sql ausgeführt?')
    setPartners((list.data as Partner[] | null) ?? [])
    setCounts({ active: active.count ?? 0, blocked: blocked.count ?? 0, trash: trash.count ?? 0 })
  }, [view])

  useEffect(() => {
    const init = async () => {
      if (!localStorage.getItem('admin')) {
        router.replace('/admin/login')
        return
      }
      await load()
      setReady(true)
    }
    init()
  }, [router, load])

  useEffect(() => {
    if (!menuId) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuId(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuId])

  async function run(action: () => Promise<string | null>, success: string) {
    setBusy(true)
    setMessage('')
    setDialogError('')
    const error = await action()
    setBusy(false)
    if (error) {
      if (dialog) setDialogError(error)
      else setMessage(error)
      return
    }
    setDialog(null)
    setMessage(success)
    await load()
  }

  const base = (id: string) => `/api/admin/partners/${id}`
  const save = (p: Partner, f: EditForm) =>
    run(() => callApi(base(p.id), 'PUT', { ...f, hourly_rate: f.hourly_rate === '' ? null : Number(f.hourly_rate) }), 'Änderungen gespeichert.')
  const block = (p: Partner, reason: string) => run(() => callApi(`${base(p.id)}/block`, 'PUT', { blocked: true, reason }), 'Partner blockiert.')
  const unblock = (p: Partner) => run(() => callApi(`${base(p.id)}/block`, 'PUT', { blocked: false }), 'Partner entsperrt.')
  const trash = (p: Partner) => run(() => callApi(`${base(p.id)}/trash`, 'PUT', {}), 'In den Papierkorb verschoben.')
  const restore = (p: Partner) => run(() => callApi(`${base(p.id)}/restore`, 'PUT'), 'Partner wiederhergestellt.')
  const hardDelete = (p: Partner) =>
    run(() => callApi(base(p.id), 'DELETE'), 'Partner endgültig gelöscht. Die E-Mail kann sich jetzt neu bewerben.')

  if (!ready) return <main className="p-8 text-center text-primary/70">Lade…</main>

  const current = VIEWS.find((v) => v.key === view)!
  const menuItem = 'block w-full px-4 py-2.5 text-left text-sm hover:bg-primary/5'

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">{current.title}</h1>
        <Link href="/admin/dashboard" className="text-sm text-primary/80 underline hover:text-primary-hover">
          ← Zurück zum Dashboard
        </Link>
      </div>

      <nav className="mb-6 flex gap-2 overflow-x-auto border-b border-primary/10">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={v.href}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
              v.key === view ? 'border-primary text-primary' : 'border-transparent text-primary/70 hover:text-primary'
            }`}
          >
            {v.label} ({counts[v.key]})
          </Link>
        ))}
      </nav>

      {message && <p className="mb-4 rounded-lg bg-primary/5 p-3 text-sm text-primary">{message}</p>}

      {partners.length === 0 ? (
        <p className="rounded-xl bg-card p-6 text-center text-sm text-primary/70 shadow-sm">
          {view === 'trash' ? 'Der Papierkorb ist leer.' : view === 'blocked' ? 'Keine blockierten Partner.' : 'Keine aktiven Partner.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {partners.map((p) => (
            <li key={p.id} className="relative rounded-2xl bg-card p-4 pr-12 shadow-sm ring-1 ring-primary/10">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-primary">{p.company_name}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    p.verified ? 'bg-primary text-card' : 'bg-background text-primary ring-1 ring-primary/30'
                  }`}
                >
                  {p.verified ? 'Verifiziert' : 'Ausstehend'}
                </span>
              </div>
              <p className="mt-1 break-words text-sm text-primary/75">
                {[p.email, p.phone, p.city, p.legal_form, p.hourly_rate !== null ? `${p.hourly_rate} €/Std.` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {p.services && p.services.length > 0 && <p className="mt-1 text-xs text-primary/60">{p.services.join(', ')}</p>}

              {view === 'blocked' && (
                <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
                  Blockiert am {formatDate(p.blocked_at)}
                  {p.blocked_reason ? ` – Grund: ${p.blocked_reason}` : ''}
                </p>
              )}
              {view === 'trash' && (
                <p className="mt-2 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary/75">
                  Gelöscht am {formatDate(p.deleted_at)}
                  {p.deleted_reason ? ` – Grund: ${p.deleted_reason}` : ''}
                </p>
              )}

              {view === 'blocked' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => unblock(p)}
                    disabled={busy}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-card hover:bg-primary-hover disabled:opacity-60"
                  >
                    Entsperren
                  </button>
                  <button
                    type="button"
                    onClick={() => openDialog({ kind: 'trash', partner: p })}
                    className="rounded-lg border border-danger px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10"
                  >
                    Löschen
                  </button>
                </div>
              )}
              {view === 'trash' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => restore(p)}
                    disabled={busy}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-card hover:bg-primary-hover disabled:opacity-60"
                  >
                    ♻️ Wiederherstellen
                  </button>
                  <button
                    type="button"
                    onClick={() => openDialog({ kind: 'hardDelete', partner: p })}
                    className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-card hover:bg-danger-hover"
                  >
                    Endgültig löschen
                  </button>
                </div>
              )}

              {view === 'active' && (
                <div className="absolute right-2 top-2">
                  <button
                    type="button"
                    onClick={() => setMenuId(menuId === p.id ? null : p.id)}
                    aria-label="Aktionen"
                    aria-haspopup="menu"
                    aria-expanded={menuId === p.id}
                    className="rounded-lg p-2 text-primary/70 hover:bg-primary/5 hover:text-primary"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                  {menuId === p.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)} />
                      <div role="menu" className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl bg-card py-1 shadow-lg ring-1 ring-primary/15">
                        <button
                          type="button"
                          role="menuitem"
                          className={`${menuItem} text-primary`}
                          onClick={() => {
                            setMenuId(null)
                            openDialog({ kind: 'edit', partner: p })
                          }}
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className={`${menuItem} text-primary`}
                          onClick={() => {
                            setMenuId(null)
                            if (p.is_blocked) unblock(p)
                            else openDialog({ kind: 'block', partner: p })
                          }}
                        >
                          {p.is_blocked ? 'Entsperren' : 'Blockieren'}
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className={`${menuItem} text-danger`}
                          onClick={() => {
                            setMenuId(null)
                            openDialog({ kind: 'trash', partner: p })
                          }}
                        >
                          Löschen
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {dialog?.kind === 'edit' && (
        <EditDialog partner={dialog.partner} busy={busy} onClose={() => setDialog(null)} onSave={(f) => save(dialog.partner, f)} />
      )}
      {dialog?.kind === 'block' && (
        <BlockDialog partner={dialog.partner} busy={busy} onClose={() => setDialog(null)} onConfirm={(r) => block(dialog.partner, r)} />
      )}
      {dialog?.kind === 'trash' && (
        <Modal title="In Papierkorb verschieben?" onClose={() => setDialog(null)}>
          <p className="text-sm text-primary/75">
            <span className="font-semibold text-primary">{dialog.partner.company_name}</span> wird in den Papierkorb verschoben und
            kann dort wiederhergestellt werden.
          </p>
          <ModalButtons onCancel={() => setDialog(null)} confirmLabel="Verschieben" danger busy={busy} onConfirm={() => trash(dialog.partner)} />
        </Modal>
      )}
      {dialog?.kind === 'hardDelete' && (
        <Modal title="Endgültig löschen?" onClose={() => setDialog(null)}>
          <p className="text-sm text-primary/75">
            <span className="font-semibold text-primary">{dialog.partner.company_name}</span> ({dialog.partner.email}) wird
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
        <p role="alert" className="fixed inset-x-4 top-4 z-[10000] mx-auto max-w-md rounded-xl bg-danger p-3 text-center text-sm font-medium text-card shadow-lg">
          {dialogError}
        </p>
      )}
    </main>
  )
}
