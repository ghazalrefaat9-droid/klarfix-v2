'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PartnerApplications from '@/components/admin/PartnerApplications'

export default function AdminPartnerApplicationsPage() {
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

  if (!ready) return <main className="p-8 text-center text-primary/70">Lade…</main>

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Partner-Anträge</h1>
        <Link href="/admin/dashboard" className="text-sm text-primary/80 underline hover:text-primary-hover">
          Zurück zum Dashboard
        </Link>
      </div>
      <PartnerApplications />
    </main>
  )
}
