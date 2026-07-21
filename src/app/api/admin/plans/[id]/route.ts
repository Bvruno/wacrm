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

  const { data } = await admin
    .from('subscription_plans')
    .select('*')
    .eq('id', id)
    .single()

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSuperAdmin()
  const admin = getAdminClient()
  const { id } = await params
  const body = await request.json()

  const { data, error } = await admin
    .from('subscription_plans')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSuperAdmin()
  const admin = getAdminClient()
  const { id } = await params

  await admin.from('subscription_plans').delete().eq('id', id)

  return NextResponse.json({ ok: true })
}
