'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Clock, Eye, Inbox, ReceiptEuro, Send, X } from 'lucide-react'
import { callApi } from '@/lib/apiClient'

type Offer = {
  id: string
  partner_id: string
  company_name: string | null
  price: number
  message: string | null
  status: 'pending' | 'sent' | 'rejected'
  created_at: string
}

const OPEN = ['new', 'offer_rejected']

const euro = (v: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v)
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const BADGE: Record<Offer['status'], { label: string; className: string }> = {
  pending: { label: 'Wartet auf Admin', className: 'bg-[#FEF3C7] text-[#92400E]' },
  sent: { label: 'An Kunde gesendet', className: 'bg-[#DCFCE7] text-[#166534]' },
  rejected: { label: 'Vom Kunden abgelehnt', className: 'bg-[#FEE2E2] text-[#991B1B]' },
}

// Icon button for a request card: "Partner Angebote" with the number of offers waiting for the admin.
export function PartnerOffersButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[#1A4D2E]/5 px-3 text-[13px] font-semibold text-[#1A4D2E] hover:bg-[#1A4D2E]/10"
    >
      <span className="relative flex">
        <ReceiptEuro className="h-4 w-4" />
        <Eye className="absolute -bottom-1 -right-1.5 h-2.5 w-2.5 rounded-full bg-[#FFFFFF]" />
      </span>
      Partner Angebote
      {count > 0 && (
        <span className="rounded-full bg-[#1A4D2E] px-2 py-0.5 text-[11px] font-bold text-[#FFFFFF]">{count}</span>
      )}
    </button>
  )
}

// Admin-only list of all partner offers for one request. The admin picks ONE and sends it to the customer.
export default function PartnerOffersModal({
  requestId,
  title,
  requestStatus,
  onClose,
  onSent,
}: {
  requestId: string
  title: string
  requestStatus: string
  onClose: () => void
  onSent: () => void
}) {
  const [offers, setOffers] = useState<Offer[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const canSend = OPEN.includes(requestStatus)

  const load = useCallback(async () => {
    const res = await callApi<{ offers: Offer[] }>('admin', `/api/admin/requests/${requestId}/offers`)
    if (!res.ok || !res.data) {
      setError(res.data?.error ?? 'Angebote konnten nicht geladen werden.')
      setOffers([])
      return
    }
    setOffers(res.data.offers ?? [])
  }, [requestId])

  useEffect(() => {
    const init = async () => {
      await load()
    }
    init()
  }, [load])

  async function send() {
    if (!selected) return
    setSending(true)
    setError('')
    const res = await callApi('admin', `/api/admin/requests/${requestId}/offers`, 'POST', { offerId: selected })
    setSending(false)
    if (!res.ok) {
      setError(res.data?.error ?? 'Angebot konnte nicht gesendet werden.')
      await load()
      return
    }
    onSent()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0F2A1D]/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Partner Angebote"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-[24px] bg-[#FFFAF5] shadow-2xl sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#1A4D2E]/10 p-6 pb-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-xl font-bold text-[#1A4D2E]">
              <ReceiptEuro className="h-5 w-5" /> Partner Angebote
            </h2>
            <p className="truncate text-sm text-[#4B5563]">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#1A4D2E]/70 hover:bg-[#1A4D2E]/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-6">
          {!canSend && requestStatus === 'offer_sent' && (
            <p className="flex items-center gap-2 rounded-xl bg-[#EDE9FE] p-3 text-sm font-medium text-[#5B21B6]">
              <Clock className="h-4 w-4 shrink-0" /> Angebot an Kunde gesendet – Warten auf Kunde.
            </p>
          )}
          {!canSend && requestStatus !== 'offer_sent' && (
            <p className="rounded-xl bg-[#F5F5F0] p-3 text-sm text-[#4B5563]">
              Für diese Anfrage kann kein weiteres Angebot gesendet werden (Status: {requestStatus}).
            </p>
          )}

          {offers === null ? (
            <p className="py-8 text-center text-sm text-[#4B5563]">Lade…</p>
          ) : offers.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#4B5563]">
              <Inbox className="mx-auto mb-2 h-8 w-8 opacity-40" />
              Noch keine Angebote von Partnern.
            </div>
          ) : (
            <ul role="radiogroup" aria-label="Angebot auswählen" className="space-y-3">
              {offers.map((o) => {
                const selectable = canSend && o.status === 'pending'
                const isSelected = selected === o.id
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={!selectable}
                      onClick={() => setSelected(isSelected ? null : o.id)}
                      className={`w-full rounded-[16px] border-2 bg-[#FFFFFF] p-4 text-start transition ${
                        isSelected ? 'border-[#1A4D2E] shadow-md' : 'border-transparent'
                      } ${selectable ? 'hover:border-[#1A4D2E]/40' : 'cursor-default opacity-80'}`}
                    >
                      <div className="flex items-start gap-3">
                        {selectable && (
                          <span
                            className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              isSelected ? 'border-[#1A4D2E] bg-[#1A4D2E] text-[#FFFFFF]' : 'border-[#1A4D2E]/30'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="h-4 w-4" />}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="min-w-0 font-bold text-[#1A4D2E]">{o.company_name ?? 'Unbekannter Partner'}</p>
                            <p className="text-xl font-bold text-[#1A4D2E]">{euro(o.price)}</p>
                          </div>
                          <p className="mt-1 whitespace-pre-line text-sm text-[#4B5563]">
                            {o.message || <span className="italic opacity-70">Keine Nachricht</span>}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#4B5563]">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" /> {dateTime(o.created_at)}
                            </span>
                            <span className={`rounded-full px-2.5 py-0.5 font-semibold ${BADGE[o.status]?.className ?? ''}`}>
                              {BADGE[o.status]?.label ?? o.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {error && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        </div>

        {canSend && selected && (
          <div className="border-t border-[#1A4D2E]/10 p-4 sm:p-6">
            <button
              type="button"
              onClick={send}
              disabled={sending}
              className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-[#1A4D2E] px-6 text-lg font-bold text-[#FFFFFF] shadow-lg hover:bg-[#2D5A4C] disabled:opacity-60"
            >
              <Send className="h-5 w-5" />
              {sending ? 'Wird gesendet…' : 'An Kunde senden'}
            </button>
            <p className="mt-2 text-center text-[12px] text-[#4B5563]">
              Der Kunde erhält nur dieses Angebot (Preis + Nachricht) von KlarFix – ohne Partnernamen.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
