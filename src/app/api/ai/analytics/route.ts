import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'

export async function GET(req: NextRequest) {
  try {
    const { supabase, accountId } = await getCurrentAccount()

    const { searchParams } = new URL(req.url)
    const days = Math.min(Number(searchParams.get('days') || 30), 90)
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data: usageData, error: usageError } = await supabase
      .from('ai_usage_log')
      .select('id, mode, provider, model, prompt_tokens, completion_tokens, total_tokens, agent_id, handoff_occurred, response_time_ms, created_at')
      .eq('account_id', accountId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })

    if (usageError) {
      console.error('[ai/analytics] usage error:', usageError)
      return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
    }

    const { data: feedbackData, error: feedbackError } = await supabase
      .from('ai_feedback')
      .select('id, conversation_id, rating, comment, created_at')
      .eq('account_id', accountId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    if (feedbackError) {
      console.error('[ai/analytics] feedback error:', feedbackError)
    }

    const { data: agentsData } = await supabase
      .from('agents')
      .select('id, name')
      .eq('account_id', accountId)

    const agentsMap = new Map((agentsData || []).map((a) => [a.id, a.name]))

    const totalTokens = (usageData || []).reduce((sum, u) => sum + (u.total_tokens || 0), 0)
    const totalCalls = (usageData || []).length
    const totalHandoffs = (usageData || []).filter((u) => u.handoff_occurred).length
    const avgResponseTime = (usageData || []).reduce((sum, u) => sum + (u.response_time_ms || 0), 0) / Math.max(totalCalls, 1)

    const autoReplyTokens = (usageData || [])
      .filter((u) => u.mode === 'auto_reply')
      .reduce((sum, u) => sum + (u.total_tokens || 0), 0)
    const draftTokens = (usageData || [])
      .filter((u) => u.mode === 'draft')
      .reduce((sum, u) => sum + (u.total_tokens || 0), 0)

    const byAgent = new Map<string, { calls: number; tokens: number; handoffs: number }>()
    for (const u of usageData || []) {
      const agentId = u.agent_id || 'unassigned'
      const existing = byAgent.get(agentId) || { calls: 0, tokens: 0, handoffs: 0 }
      existing.calls++
      existing.tokens += u.total_tokens || 0
      if (u.handoff_occurred) existing.handoffs++
      byAgent.set(agentId, existing)
    }

    const agentStats = Array.from(byAgent.entries()).map(([agentId, stats]) => ({
      agent_id: agentId,
      agent_name: agentId === 'unassigned' ? 'Unassigned' : (agentsMap.get(agentId) || 'Unknown'),
      ...stats,
    }))

    const feedbackStats = {
      total: (feedbackData || []).length,
      positive: (feedbackData || []).filter((f) => f.rating && f.rating >= 4).length,
      negative: (feedbackData || []).filter((f) => f.rating && f.rating <= 2).length,
      neutral: (feedbackData || []).filter((f) => f.rating === 3).length,
    }

    const dailyUsage: Record<string, { calls: number; tokens: number }> = {}
    for (const u of usageData || []) {
      const day = new Date(u.created_at).toISOString().split('T')[0]
      if (!dailyUsage[day]) dailyUsage[day] = { calls: 0, tokens: 0 }
      dailyUsage[day].calls++
      dailyUsage[day].tokens += u.total_tokens || 0
    }

    return NextResponse.json({
      summary: {
        totalTokens,
        totalCalls,
        totalHandoffs,
        avgResponseTime: Math.round(avgResponseTime),
        autoReplyTokens,
        draftTokens,
        handoffRate: totalCalls > 0 ? Math.round((totalHandoffs / totalCalls) * 100) : 0,
      },
      agentStats,
      feedbackStats,
      dailyUsage: Object.entries(dailyUsage).map(([date, stats]) => ({ date, ...stats })),
      feedback: feedbackData || [],
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
