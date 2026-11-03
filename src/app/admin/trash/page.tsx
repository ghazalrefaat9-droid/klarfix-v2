'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

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

export default function AdminTrashPage() {
  const router = useRouter()
  const [items, setItems] = useState<DeletedRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const loadTrash = useCallback(async () => {
    const { data, error } = await supabase
      .from('requests')
      .select('id, customer_name, customer_email, postcode, service_type, created_at, deleted_at, deleted_by')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    if (error) setMessage('Daten konnten nicht geladen werden.')
    setItems((data as DeletedRequest[]) ?? [])
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
    const { error } = await supabase.from('requests').update({ deleted_at: null, deleted_by: null }).eq('id', id)
    setBusyId(null)
    if (error) {
      setMessage('Wiederherstellen fehlgeschlagen.')
      return
    }
    setItems((prev) => prev.filter((i) => i.id !== id))
    setMessage('Anfrage wiederhergestellt.')
  }

  async function deleteForever(id: string) {
    if (!window.confirm('حذف نهائي؟ لا يمكن التراجع عن هذه العملية.')) return
    setBusyId(id)
    setMessage('')
    // .select() returns the deleted rows, so a delete silently blocked by RLS is detected.
    const { data, error } = await supabase.from('requests').delete().eq('id', id).select('id')
    setBusyId(null)
    if (error || !data?.length) {
      setMessage('Endgültiges Löschen fehlgeschlagen.')
      return
    }
    setItems((prev) => prev.filter((i) => i.id !== id))
    setMessage('Anfrage endgültig gelöscht.')
  }

  if (loading) {
    return <main className="p-8 text-center text-primary/70">Lade…</main>
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleString('de-DE')

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">🗑️ سلة المهملات ({items.length})</h1>
        <Link href="/admin/dashboard" className="text-sm font-medium text-primary underline hover:opacity-80">
          ← Zurück zum Dashboard
        </Link>
      </div>

      {message && <p className="mb-4 rounded-lg bg-primary/5 p-3 text-sm text-primary">{message}</p>}

      <div className="overflow-x-auto rounded-xl bg-card shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-primary/5 text-primary/80">
            <tr>
              <th className="px-4 py-3">Eingegangen</th>
              <th className="px-4 py-3">Kunde</th>
              <th className="px-4 py-3">PLZ</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Gelöscht am</th>
              <th className="px-4 py-3 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/10">
            {items.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-4 py-3">{new Date(r.created_at).toLocaleDateString('de-DE')}</td>
                <td className="px-4 py-3">
                  <div>{r.customer_name || '–'}</div>
                  <div className="text-primary/70">{r.customer_email}</div>
                </td>
                <td className="px-4 py-3">{r.postcode}</td>
                <td className="px-4 py-3">{r.service_type}</td>
                <td className="px-4 py-3">
                  {formatDate(r.deleted_at)}
                  {r.deleted_by && <div className="text-primary/70">von {r.deleted_by}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => restore(r.id)}
                      disabled={busyId === r.id}
                      className="rounded-lg bg-primary px-3 py-1 text-card hover:bg-primary-hover disabled:opacity-60"
                    >
                      ♻️ استعادة
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteForever(r.id)}
                      disabled={busyId === r.id}
                      className="rounded-lg bg-red-600 px-3 py-1 text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      ❌ حذف نهائي
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-primary/70">
                  سلة المهملات فارغة.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
