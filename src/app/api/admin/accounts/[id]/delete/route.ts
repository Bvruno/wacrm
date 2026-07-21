/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { getAdminClient } from '@/lib/supabase/admin'
import { notifyAccountAction } from '@/lib/admin/notifications'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSuperAdmin()
  const admin = getAdminClient()
  const { id } = await params

  const body = await _request.json()
  if (!body.confirm) {
    return NextResponse.json({ error: 'confirm is required' }, { status: 400 })
  }

  const now = new Date().toISOString()

  await admin.from('accounts').update({ deleted_at: now } as any).eq('id', id)
  await admin.from('profiles').update({ account_id: null } as any).eq('account_id', id)

  await admin.from('admin_audit_log').insert({
    actor_user_id: ctx.user.id,
    action: 'account.delete',
    target_type: 'account',
    target_id: id,
    details: { reason: body.reason ?? '' },
  } as any)

  await notifyAccountAction({ accountId: id, action: 'deleted', reason: body.reason })

  return NextResponse.json({ ok: true })
}
