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
  const { plan_id } = body

  if (!plan_id) {
    return NextResponse.json({ error: 'plan_id is required' }, { status: 400 })
  }

  const { data: plan } = await admin
    .from('subscription_plans')
    .select('id, name, slug')
    .eq('id', plan_id)
    .single()

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  const { data: account } = await admin
    .from('accounts')
    .select('id')
    .eq('id', id)
    .single()

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  const { data: existing } = await admin
    .from('account_plans')
    .select('id')
    .eq('account_id', id)
    .maybeSingle()

  if (existing) {
    const { error: updateError } = await admin
      .from('account_plans')
      .update({ plan_id, updated_at: new Date().toISOString() } as any)
      .eq('account_id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  } else {
    const { error: insertError } = await admin
      .from('account_plans')
      .insert({ account_id: id, plan_id } as any)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  await admin.from('admin_audit_log').insert({
    actor_user_id: ctx.user.id,
    action: 'account.change_plan',
    target_type: 'account',
    target_id: id,
    details: { plan_id, plan_slug: plan.slug, plan_name: plan.name },
  } as any)

  await notifyAccountAction({ accountId: id, action: 'plan_changed' })

  return NextResponse.json({ ok: true })
}
