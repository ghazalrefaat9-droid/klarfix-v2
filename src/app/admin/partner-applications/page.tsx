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

  if (!ready) return <main className="p-8 text-center text-gray-500">Lade…</main>

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0F60C6]">Partner-Anträge</h1>
        <Link href="/admin/dashboard" className="text-sm text-gray-600 underline hover:text-gray-900">
          Zurück zum Dashboard
        </Link>
      </div>
      <PartnerApplications />
    </main>
  )
}
