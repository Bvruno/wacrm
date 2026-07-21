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
  const reason = body.reason ?? ''

  await admin
    .from('account_plans')
    .update({ status: 'suspended', updated_at: new Date().toISOString() } as any)
    .eq('account_id', id)

  await admin.from('admin_audit_log').insert({
    actor_user_id: ctx.user.id,
    action: 'account.suspend',
    target_type: 'account',
    target_id: id,
    details: { reason },
  } as any)

  await notifyAccountAction({ accountId: id, action: 'suspended', reason })

  return NextResponse.json({ ok: true })
}
