/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { getAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  await requireSuperAdmin()
  const admin = getAdminClient()

  const { count: totalAccounts } = await admin
    .from('accounts')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count: newAccounts30d } = await admin
    .from('accounts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo)

  const { count: totalMessagesSent } = await admin
    .from('messages')
    .select('*', { count: 'exact', head: true })

  const { count: activeAgentsToday } = await admin
    .from('member_presence')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'online')

  const { data: planCounts } = await admin
    .from('account_plans')
    .select('plan:plan_id(slug)')

  const accountsByPlan: Record<string, number> = {}
  for (const row of (planCounts ?? []) as any[]) {
    const slug = row.plan?.slug ?? 'unknown'
    accountsByPlan[slug] = (accountsByPlan[slug] ?? 0) + 1
  }

  const { data: recentAccounts } = await admin
    .from('accounts')
    .select('id, name, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: monthlyData } = await admin
    .from('accounts')
    .select('created_at')
    .is('deleted_at', null)
    .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())

  const monthlyGrowth: Record<string, number> = {}
  for (const row of (monthlyData ?? []) as any[]) {
    const month = row.created_at?.slice(0, 7)
    if (month) monthlyGrowth[month] = (monthlyGrowth[month] ?? 0) + 1
  }

  return NextResponse.json({
    totalAccounts,
    newAccounts30d,
    totalMessagesSent,
    activeAgentsToday,
    accountsByPlan,
    recentAccounts: recentAccounts ?? [],
    monthlyGrowth: Object.entries(monthlyGrowth).map(([month, count]) => ({ month, count })),
  })
}
