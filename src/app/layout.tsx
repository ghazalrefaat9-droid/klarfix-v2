import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KlarFix',
  description: 'Reinigungsservice-Anfragen und Partnerplattform',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">{children}</body>
    </html>
  )
}
