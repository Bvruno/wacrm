/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { getAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  await requireSuperAdmin()
  const admin = getAdminClient()

  const url = new URL(request.url)
  const period = url.searchParams.get('period') ?? '30d'
  const metric = url.searchParams.get('metric') ?? 'messages'

  const days = parseInt(period.replace('d', ''))
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let data: { label: string; value: number }[] = []

  if (metric === 'messages') {
    const { data: rows } = await admin
      .from('messages')
      .select('created_at')
      .gte('created_at', startDate)

    const groups: Record<string, number> = {}
    for (const row of (rows ?? []) as any[]) {
      const day = row.created_at?.slice(0, 10)
      if (day) groups[day] = (groups[day] ?? 0) + 1
    }
    data = Object.entries(groups).map(([label, value]) => ({ label, value }))
  }

  data.sort((a, b) => a.label.localeCompare(b.label))

  return NextResponse.json({ metric, period, data })
}
