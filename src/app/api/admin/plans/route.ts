import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { getAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  await requireSuperAdmin()
  const admin = getAdminClient()

  const { data } = await admin
    .from('subscription_plans')
    .select('*')
    .order('sort_order', { ascending: true })

  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  await requireSuperAdmin()
  const admin = getAdminClient()
  const body = await request.json()

  const { data, error } = await admin
    .from('subscription_plans')
    .insert(body)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data, { status: 201 })
}
