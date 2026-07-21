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

  await admin
    .from('account_plans')
    .update({ status: 'active', updated_at: new Date().toISOString() } as any)
    .eq('account_id', id)

  await admin.from('admin_audit_log').insert({
    actor_user_id: ctx.user.id,
    action: 'account.reactivate',
    target_type: 'account',
    target_id: id,
    details: {},
  } as any)

  await notifyAccountAction({ accountId: id, action: 'reactivated' })

  return NextResponse.json({ ok: true })
}
