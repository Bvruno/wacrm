import { NextRequest, NextResponse } from 'next/server'
import {
  getCurrentAccount,
  requireRole,
  toErrorResponse,
} from '@/lib/auth/account'
import { listAgents, createAgent } from '@/lib/agents/agents'

export async function GET() {
  try {
    const { supabase, accountId } = await getCurrentAccount()

    const agents = await listAgents(supabase, accountId)

    const agentsWithoutKeys = agents.map((a) => ({
      ...a,
      has_key: true,
      has_embeddings_key: Boolean(a.embeddings_api_key),
      embeddings_api_key: undefined,
    }))

    return NextResponse.json({ agents: agentsWithoutKeys })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, accountId, userId } = await requireRole('admin')

    const body = await req.json()
    const {
      name,
      description,
      provider,
      model,
      api_key,
      system_prompt,
      temperature,
      top_p,
      frequency_penalty,
      presence_penalty,
      max_tokens,
      tone_preset,
      custom_tone_instructions,
      language,
      is_active,
      auto_reply_enabled,
      auto_reply_max_per_conversation,
      handoff_agent_id,
      embeddings_api_key,
    } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!provider || !['openai', 'anthropic'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 },
      )
    }
    if (!model || !model.trim()) {
      return NextResponse.json(
        { error: 'Model is required' },
        { status: 400 },
      )
    }
    if (!api_key || !api_key.trim()) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 },
      )
    }

    const agent = await createAgent(supabase, accountId, userId, {
      name: name.trim(),
      description: description?.trim() || null,
      provider,
      model: model.trim(),
      api_key: api_key.trim(),
      system_prompt: system_prompt?.trim() || null,
      temperature,
      top_p,
      frequency_penalty,
      presence_penalty,
      max_tokens,
      tone_preset,
      custom_tone_instructions: custom_tone_instructions?.trim() || null,
      language,
      is_active: is_active ?? false,
      auto_reply_enabled: auto_reply_enabled ?? false,
      auto_reply_max_per_conversation: auto_reply_max_per_conversation ?? 3,
      handoff_agent_id: handoff_agent_id || null,
      embeddings_api_key: embeddings_api_key?.trim() || null,
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
