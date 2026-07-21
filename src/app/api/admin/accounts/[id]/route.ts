/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { getAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSuperAdmin()
  const admin = getAdminClient()
  const { id } = await params

  const { data: account } = await admin
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single()

  if (!account) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: plan } = await admin
    .from('account_plans')
    .select('*, plan:plan_id(*)')
    .eq('account_id', id)
    .single()

  const { data: members } = await admin
    .from('profiles')
    .select('id, email, full_name, role, avatar_url')
    .eq('account_id', id)

  return NextResponse.json({ ...(account as any), plan: plan ?? null, members: members ?? [] })
}
