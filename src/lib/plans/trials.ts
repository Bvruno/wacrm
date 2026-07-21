/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAdminClient } from '@/lib/supabase/admin'

export async function checkExpiredTrials() {
  const admin = getAdminClient()

  const { data: expired } = await admin
    .from('account_plans')
    .select('*, accounts!inner(name)')
    .eq('status', 'trialing')
    .lt('trial_ends_at', new Date().toISOString())

  for (const plan of (expired ?? []) as any[]) {
    const { data: freePlan } = await admin
      .from('subscription_plans')
      .select('id')
      .eq('slug', 'free')
      .single()

    await admin
      .from('account_plans')
      .update({
        plan_id: freePlan?.id,
        status: 'active',
        trial_ends_at: null,
      } as any)
      .eq('id', plan.id)

    await admin.from('admin_audit_log').insert({
      actor_user_id: '(system)',
      action: 'plan.trial_expired',
      target_type: 'account',
      target_id: plan.account_id,
      details: { previous_plan_id: plan.plan_id },
    } as any)

    console.log(`[TRIAL] Account ${plan.account_id} trial expired, downgraded to Free`)
  }
}
