/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAdminClient } from '@/lib/supabase/admin'
import { StatsCard } from '@/components/admin/stats-card'
import { AccountsTable } from '@/components/admin/accounts-table'
import { UsageChart } from '@/components/admin/usage-chart'
import {
  Building2,
  UserPlus,
  MessageSquare,
  Users,
} from 'lucide-react'

async function getStats() {
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

  const { data: recentAccounts } = await admin
    .from('accounts')
    .select('id, name, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: monthlyData } = await admin
    .from('accounts')
    .select('created_at')
    .is('deleted_at', null)
    .gte('created_at', thirtyDaysAgo)

  const monthlyGrowth: Record<string, number> = {}
  for (const row of (monthlyData ?? []) as any[]) {
    const day = row.created_at?.slice(0, 10)
    if (day) monthlyGrowth[day] = (monthlyGrowth[day] ?? 0) + 1
  }

  return {
    totalAccounts,
    newAccounts30d,
    totalMessagesSent,
    activeAgentsToday,
    recentAccounts: (recentAccounts ?? []) as any[],
    chartData: Object.entries(monthlyGrowth).map(([label, value]) => ({ label, value })),
  }
}

export default async function AdminDashboardPage() {
  const stats = await getStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          System overview at a glance
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Accounts"
          value={stats.totalAccounts ?? 0}
          icon={Building2}
        />
        <StatsCard
          title="New (30d)"
          value={stats.newAccounts30d ?? 0}
          description="New accounts in last 30 days"
          icon={UserPlus}
        />
        <StatsCard
          title="Messages Sent"
          value={stats.totalMessagesSent ?? 0}
          description="All time"
          icon={MessageSquare}
        />
        <StatsCard
          title="Active Agents"
          value={stats.activeAgentsToday ?? 0}
          description="Online today"
          icon={Users}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Recent Accounts</h2>
          <div className="rounded-xl border">
            <AccountsTable
              accounts={stats.recentAccounts.map((a: any) => ({
                id: a.id,
                name: a.name,
                ownerEmail: '',
                plan: null,
                status: 'active',
                memberCount: 0,
                createdAt: a.created_at,
                trialEndsAt: null,
              }))}
            />
          </div>
        </div>
        <UsageChart
          title="Daily Signups (30d)"
          data={stats.chartData}
          height={200}
        />
      </div>
    </div>
  )
}
