/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAdminClient } from '@/lib/supabase/admin'
import { ForbiddenError } from '@/lib/auth/account'

type LimitKey = 'max_agents' | 'max_messages_per_day'
type FeatureKey = 'has_broadcasts' | 'has_automations' | 'has_ai_assistant'

export async function getPlanFeatures(accountId: string): Promise<Record<string, unknown>> {
  const admin = getAdminClient()
  const { data } = await admin
    .from('account_plans')
    .select('plan:plan_id(features)')
    .eq('account_id', accountId)
    .maybeSingle()
  return ((data as any)?.plan as any)?.features ?? {}
}

export async function checkPlanLimit(accountId: string, limitKey: LimitKey) {
  const features = await getPlanFeatures(accountId)
  const max = (features[limitKey] as number) ?? -1
  if (max === -1) return { allowed: true, current: 0, max: -1 }

  let current = 0
  if (limitKey === 'max_agents') {
    const admin = getAdminClient()
    const { count } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
    current = count ?? 0
  } else if (limitKey === 'max_messages_per_day') {
    const admin = getAdminClient()
    const today = new Date().toISOString().split('T')[0]
    const { count } = await admin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .gte('created_at', today)
    current = count ?? 0
  }

  return { allowed: current < max, current, max }
}

export async function enforcePlanLimit(accountId: string, limitKey: LimitKey) {
  const result = await checkPlanLimit(accountId, limitKey)
  if (!result.allowed) {
    throw new ForbiddenError(
      `Plan limit reached: ${limitKey} (${result.current}/${result.max})`
    )
  }
}

export async function checkFeatureAccess(accountId: string, featureKey: FeatureKey): Promise<boolean> {
  const features = await getPlanFeatures(accountId)
  return features[featureKey] === true
}

export async function enforceFeatureAccess(accountId: string, featureKey: FeatureKey): Promise<void> {
  const allowed = await checkFeatureAccess(accountId, featureKey)
  if (!allowed) {
    const label = featureKey
      .replace('has_', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
    throw new ForbiddenError(
      `Your plan does not include ${label}. Upgrade to access this feature.`
    )
  }
}
