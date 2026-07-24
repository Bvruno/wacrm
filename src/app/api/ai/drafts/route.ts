import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'

export async function GET(req: NextRequest) {
  try {
    const { supabase, accountId } = await getCurrentAccount()

    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversation_id')
    const limit = Math.min(Number(searchParams.get('limit') || 10), 50)

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 },
      )
    }

    const { data: drafts, error } = await supabase
      .from('ai_drafts')
      .select('id, draft_text, context_used, parameters, created_at, agent_id')
      .eq('account_id', accountId)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[ai/drafts] fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to load drafts' },
        { status: 500 },
      )
    }

    return NextResponse.json({ drafts: drafts || [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const body = await req.json()
    const { conversation_id, agent_id, draft_text, context_used, parameters } =
      body

    if (!conversation_id || !draft_text) {
      return NextResponse.json(
        { error: 'conversation_id and draft_text are required' },
        { status: 400 },
      )
    }

    const { data: draft, error } = await supabase
      .from('ai_drafts')
      .insert({
        account_id: accountId,
        conversation_id,
        agent_id: agent_id || null,
        created_by: userId,
        draft_text,
        context_used: context_used || null,
        parameters: parameters || null,
      })
      .select('id, draft_text, context_used, parameters, created_at, agent_id')
      .single()

    if (error) {
      console.error('[ai/drafts] insert error:', error)
      return NextResponse.json(
        { error: 'Failed to save draft' },
        { status: 500 },
      )
    }

    try {
      await supabase.rpc('cleanup_old_drafts', {
        p_conversation_id: conversation_id,
        p_keep: 50,
      })
    } catch {
      // Best-effort cleanup
    }

    return NextResponse.json({ draft })
  } catch (err) {
    return toErrorResponse(err)
  }
}
