'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Calendar, Mail, MapPin, RotateCcw, Trash2, User } from 'lucide-react'
import { callApi } from '@/lib/apiClient'
import { Modal, ModalButtons, PartnerList } from '@/components/admin/PartnersManager'
import AdminNotifications from '@/components/admin/AdminNotifications'

type DeletedRequest = {
  id: string
  customer_name: string | null
  customer_email: string
  postcode: string
  service_type: string
  created_at: string
  deleted_at: string
  deleted_by: string | null
}

const card = 'rounded-[20px] bg-[#FFFFFF] shadow-[0_2px_10px_rgba(0,0,0,0.05)]'
const actionButton =
  'flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#F5F5F0] py-2.5 text-[12px] font-medium text-[#1A4D2E] transition hover:bg-[#ECECE4] disabled:opacity-50'

export default function AdminTrashPage() {
  const router = useRouter()
  const [items, setItems] = useState<DeletedRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [confirmTarget, setConfirmTarget] = useState<DeletedRequest | null>(null)

  const loadTrash = useCallback(async () => {
    const res = await callApi<{ items: DeletedRequest[] }>('admin', '/api/admin/requests')
    if (!res.ok) setMessage(res.data?.error ?? 'Daten konnten nicht geladen werden.')
    setItems(res.data?.items ?? [])
  }, [])

  useEffect(() => {
    const init = async () => {
      if (!localStorage.getItem('admin')) {
        router.replace('/admin/login')
        return
      }
      await loadTrash()
      setLoading(false)
    }
    init()
  }, [router, loadTrash])

  async function restore(id: string) {
    setBusyId(id)
    setMessage('')
    const res = await callApi('admin', `/api/admin/requests/${id}`, 'PATCH', { action: 'restore' })
    setBusyId(null)
    if (!res.ok) {
      setMessage(res.data?.error ?? 'Wiederherstellen fehlgeschlagen.')
      return
    }
    setItems((prev) => prev.filter((i) => i.id !== id))
    setMessage('Anfrage wiederhergestellt.')
  }

  async function deleteForever(id: string) {
    setBusyId(id)
    setMessage('')
    const res = await callApi('admin', `/api/admin/requests/${id}`, 'DELETE')
    setBusyId(null)
    setConfirmTarget(null)
    if (!res.ok) {
      setMessage(res.data?.error ?? 'Endgültiges Löschen fehlgeschlagen.')
      return
    }
    setItems((prev) => prev.filter((i) => i.id !== id))
    setMessage('Anfrage endgültig gelöscht.')
  }

  if (loading) {
    return <div className="min-h-screen bg-[#E6F1E6] p-8 text-center text-[#4B5563]">Lade…</div>
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleString('de-DE')

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
          <h1 className="min-w-0 flex-1 truncate text-2xl font-bold text-[#1A4D2E]">Papierkorb</h1>
          <AdminNotifications />
        </div>

        {message && <p className={`${card} mb-4 p-3 text-sm text-[#1A4D2E]`}>{message}</p>}

        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#4B5563]">Anfragen ({items.length})</h2>
        {items.length === 0 ? (
          <div className={`${card} flex flex-col items-center px-6 py-8 text-center`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#A8D5A2]/50 text-[#1A4D2E]">
              <AlertCircle className="h-6 w-6" />
            </span>
            <p className="mt-3 font-semibold text-[#1A4D2E]">Keine Anfragen im Papierkorb</p>
            <p className="mt-1 text-[13px] text-[#4B5563]">Gelöschte Anfragen erscheinen hier und können wiederhergestellt werden.</p>
          </div>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {items.map((r) => (
              <li key={r.id} className={`${card} p-4`}>
                <h3 className="truncate font-bold text-[#1A4D2E]">{r.service_type}</h3>
                <div className="mt-2 space-y-1 text-[13px] text-[#4B5563]">
                  <p className="flex min-w-0 items-center gap-2">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{r.customer_name || '–'}</span>
                  </p>
                  <p className="flex min-w-0 items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{r.customer_email}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" /> {r.postcode}
                  </p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0" /> Eingegangen {new Date(r.created_at).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <p className="mt-3 rounded-xl bg-[#F5F5F0] px-3 py-2 text-xs text-[#4B5563]">
                  Gelöscht am {formatDate(r.deleted_at)}
                  {r.deleted_by ? ` von ${r.deleted_by}` : ''}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => restore(r.id)} disabled={busyId === r.id} className={actionButton}>
                    <RotateCcw className="h-4 w-4" /> Wiederherstellen
                  </button>
                  <button type="button" onClick={() => setConfirmTarget(r)} disabled={busyId === r.id} className={`${actionButton} text-danger`}>
                    <Trash2 className="h-4 w-4" /> Endgültig löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#4B5563]">Partner</h2>
          <PartnerList initialView="trash" />
        </section>

        {confirmTarget && (
          <Modal title="Endgültig löschen?" onClose={() => setConfirmTarget(null)}>
            <p className="text-sm text-[#4B5563]">
              Die Anfrage von <span className="font-semibold text-[#1A4D2E]">{confirmTarget.customer_name || confirmTarget.customer_email}</span>{' '}
              wird vollständig gelöscht. Das kann nicht rückgängig gemacht werden.
            </p>
            <ModalButtons
              onCancel={() => setConfirmTarget(null)}
              confirmLabel="Endgültig löschen"
              danger
              busy={busyId === confirmTarget.id}
              onConfirm={() => deleteForever(confirmTarget.id)}
            />
          </Modal>
        )}
      </main>
    </div>
  )
}
