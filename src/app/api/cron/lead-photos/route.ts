import { connection, NextResponse } from 'next/server'
import { deleteExpiredLeadPhotos } from '@/lib/leadPhotosServer'

// Daily Vercel cron (vercel.json): deletes customer photos older than 30 days.
export async function GET(request: Request) {
  await connection()
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const deleted = await deleteExpiredLeadPhotos()
  return NextResponse.json({ ok: true, deleted })
}
