import Link from 'next/link'

// Shared look for the export/settings pages: warm white background, dark green titles, orange primary buttons.
export const pageClass = 'min-h-screen bg-[#FFF9F5]'
export const cardClass = 'rounded-[24px] bg-[#FFFFFF] shadow-[0_12px_32px_-14px_rgba(27,67,50,0.22)]'
export const btnPrimary =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#E86A33] px-6 font-bold text-[#FFFFFF] shadow-[0_10px_24px_-8px_rgba(232,106,51,0.65)] transition hover:-translate-y-0.5 hover:bg-[#CF5824] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none'
export const fieldClass =
  'w-full rounded-[14px] border-[1.5px] border-[#F0E4DA] bg-[#FFFFFF] px-3.5 py-2.5 text-[#1B4332] outline-none transition focus:border-[#E86A33] focus:shadow-[0_0_0_4px_rgba(232,106,51,0.15)] disabled:opacity-45'

export function BackToAdmin({ label = '← رجوع للأدمن' }: { label?: string }) {
  return (
    <Link
      href="/admin/dashboard"
      dir="auto"
      className="inline-flex min-h-[44px] items-center rounded-[14px] bg-[#FFFFFF] px-4 text-sm font-semibold text-[#1B4332] shadow-[0_4px_14px_-6px_rgba(27,67,50,0.25)] transition hover:-translate-y-0.5"
    >
      {label}
    </Link>
  )
}
