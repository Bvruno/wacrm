import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'

export async function GET() {
  try {
    const { supabase, accountId } = await getCurrentAccount()

    const { data: sessions, error } = await supabase
      .from('ai_playground_sessions')
      .select('id, name, messages, tool_calls, created_at, updated_at')
      .eq('account_id', accountId)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[ai/playground/sessions] fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to load sessions' },
        { status: 500 },
      )
    }

    return NextResponse.json({ sessions: sessions || [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const body = await req.json()
    const { name, messages, tool_calls } = body

    const { data: session, error } = await supabase
      .from('ai_playground_sessions')
      .insert({
        account_id: accountId,
        created_by: userId,
        name: name || 'Untitled session',
        messages: messages || [],
        tool_calls: tool_calls || [],
      })
      .select('id, name, messages, tool_calls, created_at, updated_at')
      .single()

    if (error) {
      console.error('[ai/playground/sessions] insert error:', error)
      return NextResponse.json(
        { error: 'Failed to save session' },
        { status: 500 },
      )
    }

    return NextResponse.json({ session })
  } catch (err) {
    return toErrorResponse(err)
  }
}
