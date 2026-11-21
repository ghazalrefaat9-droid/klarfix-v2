import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/components/LanguageProvider'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'KlarFix – Reinigung in Stuttgart',
  description: 'Professionelle Wohnungs-, Büro-, Fenster- und Grundreinigung in Stuttgart. تنظيف احترافي في شتوتغارت.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-background font-sans text-primary antialiased">
        <LanguageProvider>
          <Navbar />
          {children}
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  )
}
