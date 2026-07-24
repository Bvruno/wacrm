import { NextRequest, NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, accountId } = await requireRole('agent')

    const agent = await supabase
      .from('agents')
      .select('id, account_id')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle()

    if (!agent.data) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const { data: tools, error } = await supabase
      .from('agent_tools')
      .select('id, name, description, parameters, endpoint, is_builtin, created_at')
      .eq('agent_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[agents/tools] fetch error:', error)
      return NextResponse.json({ error: 'Failed to load tools' }, { status: 500 })
    }

    return NextResponse.json({ tools: tools || [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, accountId } = await requireRole('admin')

    const agent = await supabase
      .from('agents')
      .select('id, account_id')
      .eq('id', id)
      .eq('account_id', accountId)
      .maybeSingle()

    if (!agent.data) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const body = await req.json()
    const { name, description, parameters, endpoint } = body

    if (!name || !description || !parameters) {
      return NextResponse.json(
        { error: 'name, description, and parameters are required' },
        { status: 400 },
      )
    }

    const { data: tool, error } = await supabase
      .from('agent_tools')
      .insert({
        agent_id: id,
        name: name.trim(),
        description: description.trim(),
        parameters,
        endpoint: endpoint?.trim() || null,
      })
      .select('id, name, description, parameters, endpoint, is_builtin, created_at')
      .single()

    if (error) {
      console.error('[agents/tools] insert error:', error)
      return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 })
    }

    return NextResponse.json({ tool })
  } catch (err) {
    return toErrorResponse(err)
  }
}
