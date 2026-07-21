import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { getAdminClient } from '@/lib/supabase/admin'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSuperAdmin()
  const admin = getAdminClient()
  const { id } = await params
  const body = await request.json()

  const { data, error } = await admin
    .from('feature_flags')
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

  await admin.from('feature_flags').delete().eq('id', id)

  return NextResponse.json({ ok: true })
}
