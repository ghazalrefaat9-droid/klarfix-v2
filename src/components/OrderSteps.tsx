'use client'

import { Handshake, ReceiptEuro, Send, Sparkles, type LucideIcon } from 'lucide-react'
import { useLang } from '@/components/LanguageProvider'

type StepState = 'done' | 'active' | 'todo'

// Progress derived only from the existing request status:
// offer_pending (partner view: waiting for admin) -> 1 done | offer_sent -> 1 done, 2 waiting
// offer_accepted / assigned -> 1+2 done | done -> all done.
function stepStates(status: string): [StepState, StepState, StepState] {
  if (status === 'done') return ['done', 'done', 'done']
  if (status === 'offer_accepted' || status === 'assigned') return ['done', 'done', 'todo']
  if (status === 'offer_sent') return ['done', 'active', 'todo']
  if (status === 'offer_pending') return ['done', 'todo', 'todo']
  return ['todo', 'todo', 'todo']
}

const circleClass: Record<StepState, string> = {
  done: 'border-primary bg-primary text-card',
  active: 'border-primary bg-card text-primary',
  todo: 'border-primary/20 bg-card text-primary/30',
}

function Step({ icon: Icon, label, state, badge }: { icon: LucideIcon; label: string; state: StepState; badge?: LucideIcon }) {
  const Badge = badge
  return (
    <li className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center sm:w-24">
      <span className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition ${circleClass[state]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
        {Badge && (
          <span
            className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
              state === 'todo' ? 'border-primary/20 bg-card text-primary/30' : 'border-card bg-primary text-card'
            }`}
          >
            <Badge className="h-2.5 w-2.5" aria-hidden="true" />
          </span>
        )}
      </span>
      <span className={`text-[11px] font-semibold leading-tight sm:text-xs ${state === 'todo' ? 'text-primary/40' : 'text-primary'}`}>
        {label}
      </span>
    </li>
  )
}

function Line({ filled }: { filled: boolean }) {
  return <li aria-hidden="true" className={`mt-[21px] h-0.5 min-w-4 flex-1 rounded-full ${filled ? 'bg-primary' : 'bg-primary/15'}`} />
}

export default function OrderSteps({ status, className = '' }: { status: string; className?: string }) {
  const { t } = useLang()
  const [sent, accepted, done] = stepStates(status)
  const labels = [
    t('Angebot gesendet', 'تم إرسال العرض', 'Offer sent'),
    t('Kunde hat angenommen', 'وافق العميل', 'Customer accepted'),
    t('Auftrag erledigt', 'تم إنجاز الطلب', 'Job done'),
  ]

  return (
    <ol aria-label={t('Auftragsstatus', 'حالة الطلب', 'Job status')} className={`flex items-start justify-between ${className}`}>
      <Step icon={ReceiptEuro} badge={Send} label={labels[0]} state={sent} />
      <Line filled={accepted !== 'todo'} />
      <Step icon={Handshake} label={labels[1]} state={accepted} />
      <Line filled={done === 'done'} />
      <Step icon={Sparkles} label={labels[2]} state={done} />
    </ol>
  )
}
