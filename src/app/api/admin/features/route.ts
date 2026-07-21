import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { getAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  await requireSuperAdmin()
  const admin = getAdminClient()

  const { data } = await admin
    .from('feature_flags')
    .select('*, account:account_id(name)')
    .order('key', { ascending: true })

  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  await requireSuperAdmin()
  const admin = getAdminClient()
  const body = await request.json()

  const { data, error } = await admin
    .from('feature_flags')
    .insert(body)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data, { status: 201 })
}
