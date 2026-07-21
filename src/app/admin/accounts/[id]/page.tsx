/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAdminClient } from '@/lib/supabase/admin'
import { AccountDetailCard } from '@/components/admin/account-detail-card'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminAccountDetailPage({ params }: PageProps) {
  const admin = getAdminClient()
  const { id } = await params

  const { data: account } = await admin
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single()

  if (!account) {
    return <p className="py-8 text-center text-muted-foreground">Account not found</p>
  }

  const { data: plan } = await admin
    .from('account_plans')
    .select('*, plan:plan_id(*)')
    .eq('account_id', id)
    .single()

  const { data: members } = await admin
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('account_id', id)

  const { data: plans } = await admin
    .from('subscription_plans')
    .select('id, name, slug')
    .order('sort_order', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{account.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Account details and management
        </p>
      </div>

      <AccountDetailCard
        account={{
          ...(account as any),
          plan: plan ?? null,
          members: members ?? [],
        }}
        plans={plans ?? []}
      />
    </div>
  )
}
