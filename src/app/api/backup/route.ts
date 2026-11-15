import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/session'
import { hasExportSession } from '@/lib/exportPin'
import { loadExport, logExport, parseFilters, toCsv, toJson, toXlsx } from '@/lib/exportData'

export const maxDuration = 60

const noStore = { 'Cache-Control': 'no-store' }
const CONTENT_TYPES = {
  json: 'application/json; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const

// GET ?type&city&service&status&from&to&format → file download. Add &count=1 for the preview count only.
export async function GET(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied
  if (!(await hasExportSession())) {
    return NextResponse.json({ error: 'PIN erforderlich.', needPin: true }, { status: 403, headers: noStore })
  }

  const params = new URL(request.url).searchParams
  const filters = parseFilters(params)
  if (typeof filters === 'string') return NextResponse.json({ error: filters }, { status: 400, headers: noStore })

  try {
    const data = await loadExport(filters)

    if (params.get('count') === '1') {
      const counts = Object.fromEntries(Object.entries(data).map(([k, rows]) => [k, rows?.length ?? 0]))
      const total = Object.values(counts).reduce((a, b) => a + b, 0)
      return NextResponse.json({ total, counts }, { headers: noStore })
    }

    const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })
    const filename = `klarfix-${filters.type}-${date}.${filters.format}`
    const body =
      filters.format === 'json' ? toJson(data) : filters.format === 'csv' ? toCsv(data) : await toXlsx(data)

    await logExport(filters)
    return new Response(body, {
      headers: {
        ...noStore,
        'Content-Type': CONTENT_TYPES[filters.format],
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('backup failed:', err)
    return NextResponse.json({ error: 'Export fehlgeschlagen.' }, { status: 500, headers: noStore })
  }
}
