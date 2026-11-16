'use client'

import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'

// "Zurück" button: sub-pages go back to the Übersicht, the Übersicht goes to the homepage.
export function BackButton({ onClick, label = '← Zurück' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="mb-3 inline-flex min-h-[44px] items-center text-sm font-semibold text-[#1B4332] hover:underline">
      {label}
    </button>
  )
}

// White "Abmelden" button with a confirmation dialog. Only rendered on the main (Übersicht) page.
export function LogoutButton({ onConfirm }: { onConfirm: () => void }) {
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    if (!asking) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAsking(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [asking])

  return (
    <>
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-[#1B4332]/15 bg-[#FFFFFF] px-4 text-sm font-semibold text-[#1B4332] shadow-sm hover:bg-[#F5F5F0]"
      >
        <LogOut className="h-4 w-4 shrink-0 text-[#E85D5D]" aria-hidden />
        Abmelden
      </button>
      {asking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000]/50 p-4" onClick={() => setAsking(false)}>
          <div role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-[#FFFFFF] p-6 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold text-[#1B4332]">Wirklich abmelden?</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={onConfirm} className="min-h-[44px] flex-1 rounded-lg bg-[#E85D5D] text-sm font-semibold text-[#FFFFFF]">
                Ja
              </button>
              <button type="button" onClick={() => setAsking(false)} className="min-h-[44px] flex-1 rounded-lg border border-[#1B4332]/20 text-sm font-semibold text-[#1B4332]">
                Nein
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
