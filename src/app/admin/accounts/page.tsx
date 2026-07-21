/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAdminClient } from '@/lib/supabase/admin'
import { AccountsTable } from '@/components/admin/accounts-table'

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; plan?: string; status?: string }>
}

export default async function AdminAccountsPage({ searchParams }: PageProps) {
  const admin = getAdminClient()
  const params = await searchParams
  const page = parseInt(params.page ?? '1')
  const perPage = 20
  const search = params.search ?? ''
  const plan = params.plan ?? ''
  const status = params.status ?? ''

  let query = admin
    .from('accounts')
    .select('id, name, created_at, deleted_at, profiles!inner(email), account_plans!inner(plan_id, status, trial_ends_at, plan:plan_id(name, slug))', { count: 'exact' })
    .is('deleted_at', null)

  if (search) {
    query = query.or(`name.ilike.%${search}%,profiles.email.ilike.%${search}%`)
  }
  if (plan) query = query.eq('account_plans.plan.slug', plan)
  if (status) query = query.eq('account_plans.status', status)

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data: accounts, count: total } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  const rows = await Promise.all(((accounts ?? []) as any[]).map(async (acc: any) => {
    const planData = acc.account_plans?.[0]

    const { count: memberCount } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', acc.id)

    return {
      id: acc.id,
      name: acc.name,
      ownerEmail: acc.profiles?.[0]?.email ?? '',
      plan: planData ? { name: planData.plan?.name, slug: planData.plan?.slug } : null,
      status: planData?.status ?? 'active',
      memberCount: memberCount ?? 0,
      createdAt: acc.created_at,
      trialEndsAt: planData?.trial_ends_at ?? null,
    }
  }))

  const totalPages = Math.ceil((total ?? 0) / perPage)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total ?? 0} total accounts
        </p>
      </div>

      <div className="rounded-xl border">
        <AccountsTable accounts={rows} />
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/admin/accounts?page=${p}`}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm ${
                p === page
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
