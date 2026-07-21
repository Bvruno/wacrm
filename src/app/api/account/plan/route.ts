/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { getAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const ctx = await requireRole('viewer')
    const admin = getAdminClient()

    const { data: accountPlan, error: planError } = await admin
      .from('account_plans')
      .select('*, plan:plan_id(*)')
      .eq('account_id', ctx.accountId)
      .maybeSingle()

    if (planError) {
      console.error('[account/plan] fetch ERROR:', planError)
    }

    const plan = (accountPlan as any)?.plan
    const features = (plan?.features as any) ?? {}

    const { count: agents } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', ctx.accountId)

    const today = new Date().toISOString().split('T')[0]
    const { count: messagesToday } = await admin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', ctx.accountId)
      .gte('created_at', today)

    const response = {
      plan: {
        name: plan?.name ?? 'Free',
        slug: plan?.slug ?? 'free',
        price: plan?.price ?? 0,
        currency: plan?.currency ?? 'usd',
      },
      status: (accountPlan as any)?.status ?? 'active',
      trialEndsAt: (accountPlan as any)?.trial_ends_at ?? null,
      limits: {
        maxAgents: features.max_agents ?? 2,
        maxMessagesPerDay: features.max_messages_per_day ?? 100,
        has_broadcasts: features.has_broadcasts ?? false,
        has_automations: features.has_automations ?? false,
        has_ai_assistant: features.has_ai_assistant ?? false,
      },
      usage: {
        agents: agents ?? 0,
        messagesToday: messagesToday ?? 0,
      },
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[account/plan] CATCH error:', err)
    return toErrorResponse(err)
  }
}
