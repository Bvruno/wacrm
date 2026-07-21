import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { getAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  await requireSuperAdmin()
  const admin = getAdminClient()

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const perPage = parseInt(url.searchParams.get('per_page') ?? '50')
  const action = url.searchParams.get('action') ?? ''
  const targetType = url.searchParams.get('target_type') ?? ''
  const from = url.searchParams.get('from') ?? ''
  const to = url.searchParams.get('to') ?? ''

  let query = admin
    .from('admin_audit_log')
    .select('*', { count: 'exact' })

  if (action) query = query.eq('action', action)
  if (targetType) query = query.eq('target_type', targetType)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const rangeFrom = (page - 1) * perPage
  const rangeTo = rangeFrom + perPage - 1

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(rangeFrom, rangeTo)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [], total: count, page, perPage })
}
