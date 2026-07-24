import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, accountId } = await getCurrentAccount()

    const { data: session, error } = await supabase
      .from('ai_playground_sessions')
      .select('id, name, messages, tool_calls, created_at, updated_at')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle()

    if (error) {
      console.error('[ai/playground/sessions] fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to load session' },
        { status: 500 },
      )
    }

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ session })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, accountId } = await requireRole('agent')

    const body = await req.json()

    const { data: session, error } = await supabase
      .from('ai_playground_sessions')
      .update({
        name: body.name,
        messages: body.messages,
        tool_calls: body.tool_calls,
      })
      .eq('id', id)
      .eq('account_id', accountId)
      .select('id, name, messages, tool_calls, created_at, updated_at')
      .single()

    if (error) {
      console.error('[ai/playground/sessions] update error:', error)
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 },
      )
    }

    return NextResponse.json({ session })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, accountId } = await requireRole('agent')

    const { error } = await supabase
      .from('ai_playground_sessions')
      .delete()
      .eq('id', id)
      .eq('account_id', accountId)

    if (error) {
      console.error('[ai/playground/sessions] delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete session' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
