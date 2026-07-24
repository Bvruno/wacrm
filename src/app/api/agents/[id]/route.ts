import { NextRequest, NextResponse } from 'next/server'
import {
  getCurrentAccount,
  requireRole,
  toErrorResponse,
} from '@/lib/auth/account'
import {
  getAgent,
  updateAgent,
  deleteAgent,
} from '@/lib/agents/agents'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, accountId } = await getCurrentAccount()

    const agent = await getAgent(supabase, id)
    if (!agent || agent.account_id !== accountId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      agent: {
        ...agent,
        has_key: true,
        has_embeddings_key: Boolean(agent.embeddings_api_key),
        embeddings_api_key: undefined,
      },
    })
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
    const { supabase, accountId } = await requireRole('admin')

    const existing = await getAgent(supabase, id)
    if (!existing || existing.account_id !== accountId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await req.json()

    const agent = await updateAgent(supabase, id, {
      name: body.name?.trim() || undefined,
      description:
        body.description !== undefined
          ? body.description?.trim() || null
          : undefined,
      avatar_url: body.avatar_url,
      provider: body.provider,
      model: body.model?.trim() || undefined,
      api_key: body.api_key?.trim() || undefined,
      system_prompt:
        body.system_prompt !== undefined
          ? body.system_prompt?.trim() || null
          : undefined,
      temperature: body.temperature,
      top_p: body.top_p,
      frequency_penalty: body.frequency_penalty,
      presence_penalty: body.presence_penalty,
      max_tokens: body.max_tokens,
      tone_preset: body.tone_preset,
      custom_tone_instructions:
        body.custom_tone_instructions !== undefined
          ? body.custom_tone_instructions?.trim() || null
          : undefined,
      language: body.language,
      is_active: body.is_active,
      auto_reply_enabled: body.auto_reply_enabled,
      auto_reply_max_per_conversation: body.auto_reply_max_per_conversation,
      handoff_agent_id:
        body.handoff_agent_id !== undefined
          ? body.handoff_agent_id || null
          : undefined,
      embeddings_api_key:
        body.embeddings_api_key !== undefined
          ? body.embeddings_api_key?.trim() || null
          : undefined,
    })

    return NextResponse.json({
      agent: {
        ...agent,
        has_key: true,
        has_embeddings_key: Boolean(agent.embeddings_api_key),
        embeddings_api_key: undefined,
      },
    })
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes('unique')
        ? 'An agent with this name already exists'
        : undefined
    if (message) {
      return NextResponse.json({ error: message }, { status: 409 })
    }
    return toErrorResponse(err)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, accountId } = await requireRole('admin')

    const existing = await getAgent(supabase, id)
    if (!existing || existing.account_id !== accountId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await deleteAgent(supabase, id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
