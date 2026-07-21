/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { getAdminClient } from '@/lib/supabase/admin'

/**
 * DEBUG endpoint: dump the raw account_plans + subscription_plans state
 * for a given account. Only accessible by super-admin.
 * Usage: GET /api/debug/plan?account_id=xxx
 */
export async function GET(request: Request) {
  await requireSuperAdmin()
  const admin = getAdminClient()

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')

  if (!accountId) {
    return NextResponse.json({ error: 'account_id query param is required' }, { status: 400 })
  }

  const { data: account } = await admin
    .from('accounts')
    .select('id, name, created_at')
    .eq('id', accountId)
    .maybeSingle()

  const { data: accountPlan, error: apError } = await admin
    .from('account_plans')
    .select('*, plan:plan_id(*)')
    .eq('account_id', accountId)
    .maybeSingle()

  const { data: allPlans } = await admin
    .from('subscription_plans')
    .select('*')
    .order('sort_order', { ascending: true })

  return NextResponse.json({
    account,
    account_plans: {
      row: accountPlan,
      error: apError?.message ?? null,
    },
    subscription_plans: allPlans,
  })
}
