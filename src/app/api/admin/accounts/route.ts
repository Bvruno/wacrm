/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/super-admin'
import { getAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  await requireSuperAdmin()
  const admin = getAdminClient()

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const perPage = parseInt(url.searchParams.get('per_page') ?? '20')
  const search = url.searchParams.get('search') ?? ''
  const plan = url.searchParams.get('plan') ?? ''
  const status = url.searchParams.get('status') ?? ''
  const sortBy = url.searchParams.get('sort_by') ?? 'created_at'
  const sortDir = url.searchParams.get('sort_dir') ?? 'desc'

  let query = admin
    .from('accounts')
    .select('id, name, created_at, deleted_at, profiles!inner(email), account_plans!inner(plan_id, status, trial_ends_at, plan:plan_id(name, slug))', { count: 'exact' })
    .is('deleted_at', null)

  if (search) {
    query = query.or(`name.ilike.%${search}%,profiles.email.ilike.%${search}%`)
  }
  if (plan) {
    query = query.eq('account_plans.plan.slug', plan)
  }
  if (status) {
    query = query.eq('account_plans.status', status)
  }

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const { data: accounts, count: total, error } = await query
    .order(sortBy, { ascending: sortDir === 'asc' })
    .range(from, to)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const result = ((accounts ?? []) as any[]).map((acc: any) => {
    const planData = acc.account_plans?.[0]
    return {
      id: acc.id,
      name: acc.name,
      createdAt: acc.created_at,
      ownerEmail: acc.profiles?.[0]?.email ?? '',
      plan: planData ? { name: planData.plan?.name, slug: planData.plan?.slug } : null,
      status: planData?.status,
      trialEndsAt: planData?.trial_ends_at,
    }
  })

  return NextResponse.json({ accounts: result, total, page, perPage })
}
