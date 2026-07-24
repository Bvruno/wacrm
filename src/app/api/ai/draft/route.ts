import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { getDefaultAgent } from '@/lib/agents/agents'
import { buildConversationContext } from '@/lib/ai/context'
import { retrieveKnowledge } from '@/lib/ai/knowledge'
import { generateReply } from '@/lib/ai/generate'
import { buildSystemPrompt } from '@/lib/ai/defaults'
import { buildContactProfile, formatContactProfile } from '@/lib/ai/contact-profile'
import { AI_TOOLS, executeToolCalls } from '@/lib/ai/tools'
import { latestUserMessage } from '@/lib/ai/query'
import { logAiUsage } from '@/lib/ai/usage'
import { supabaseAdmin } from '@/lib/ai/admin-client'
import { AiError } from '@/lib/ai/types'
import { getToneInstructions } from '@/lib/ai/tone-presets'

/**
 * POST /api/ai/draft  (agent+)
 *
 * Body: { conversation_id }
 * Returns: { draft } — a suggested reply for the agent to edit + send.
 *
 * Uses the account's configured provider/key (BYO). Read-only: it never
 * sends or stores anything, just hands text back to the composer.
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const userLimit = checkRateLimit(`ai-draft:${userId}`, RATE_LIMITS.aiDraft)
    if (!userLimit.success) return rateLimitResponse(userLimit)
    // Also cap the whole team's draws on the shared BYO provider key.
    const accountLimit = checkRateLimit(
      `ai-draft-acct:${accountId}`,
      RATE_LIMITS.aiDraftAccount,
    )
    if (!accountLimit.success) return rateLimitResponse(accountLimit)

    const body = await request.json().catch(() => null)
    const conversationId =
      body && typeof body.conversation_id === 'string' ? body.conversation_id : ''
    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 },
      )
    }

    // RLS scopes the SSR client to the caller's account, so a missing
    // row means "not yours / not found" either way.
    const { data: conversation, error: convErr } = await supabase
      .from('conversations')
      .select('id, contact_id')
      .eq('id', conversationId)
      .maybeSingle()
    if (convErr) {
      console.error('[ai/draft] conversation lookup error:', convErr)
      return NextResponse.json({ error: 'Failed to load conversation' }, { status: 500 })
    }
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const config = await getDefaultAgent(supabase, accountId).catch((err) => {
      console.error('[ai/draft] getDefaultAgent error:', err)
      throw new AiError('Stored API key could not be decrypted.', {
        code: 'key_decrypt_failed',
        status: 400,
      })
    })
    if (!config) {
      return NextResponse.json(
        {
          error: 'AI assistant is not set up. Enable it in Settings → AI Assistant.',
          code: 'ai_not_configured',
        },
        { status: 400 },
      )
    }

    const messages = await buildConversationContext(supabase, conversationId)
    if (messages.length === 0) {
      return NextResponse.json(
        {
          error: 'No messages to draft from yet.',
          code: 'no_messages',
        },
        { status: 400 },
      )
    }

    const aiConfig = {
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      systemPrompt: config.systemPrompt,
      isActive: config.isActive,
      autoReplyEnabled: config.autoReplyEnabled,
      autoReplyMaxPerConversation: config.autoReplyMaxPerConversation,
      handoffAgentId: config.handoffAgentId,
      embeddingsApiKey: config.embeddingsApiKey,
    }

    const knowledge = await retrieveKnowledge(
      supabase,
      accountId,
      aiConfig,
      latestUserMessage(messages),
    )

    const profile = conversation.contact_id
      ? await buildContactProfile(supabase, conversation.contact_id)
      : null
    const contactProfile = profile ? formatContactProfile(profile) : undefined

    const toneInstructions = getToneInstructions(config.tonePreset)

    const systemPrompt = buildSystemPrompt({
      userPrompt: config.systemPrompt,
      mode: 'draft',
      knowledge,
      contactProfile,
      toneInstructions,
      customToneInstructions: config.customToneInstructions,
    })

    const contactId = conversation.contact_id
    const { text, usage } = await generateReply({
      config: aiConfig,
      systemPrompt,
      messages,
      tools: AI_TOOLS,
      executeTools: contactId
        ? (calls) =>
            executeToolCalls({ db: supabase, accountId, contactId }, calls)
        : undefined,
      temperature: config.temperature,
      topP: config.topP,
      frequencyPenalty: config.frequencyPenalty,
      presencePenalty: config.presencePenalty,
      maxTokens: config.maxTokens,
    })

    // Record spend on the account's BYO key. Best-effort + via the
    // service role (the log has no `authenticated` INSERT policy). This
    // must not fail or delay the draft the agent is waiting on, so:
    //  - the whole thing is wrapped (constructing the admin client throws
    //    if the service-role key is unset — that must not 500 the draft);
    //  - it's fire-and-forget (`void`), not awaited, so the response
    //    isn't held for a DB round-trip.
    try {
      void logAiUsage(supabaseAdmin(), {
        accountId,
        conversationId,
        mode: 'draft',
        provider: config.provider,
        model: config.model,
        usage,
      })
    } catch (logErr) {
      console.error('[ai/draft] usage log skipped:', logErr)
    }

    try {
      await supabase.from('ai_drafts').insert({
        account_id: accountId,
        conversation_id: conversationId,
        created_by: userId,
        draft_text: text,
        context_used: {
          knowledge_count: knowledge.length,
          contact_profile: contactProfile || null,
          tone_preset: config.tonePreset || null,
        },
        parameters: {
          temperature: config.temperature,
          top_p: config.topP,
          max_tokens: config.maxTokens,
          tone_preset: config.tonePreset || null,
        },
      })

      try {
        await supabase.rpc('cleanup_old_drafts', {
          p_conversation_id: conversationId,
          p_keep: 50,
        })
      } catch {
        // Best-effort cleanup
      }
    } catch (draftErr) {
      console.error('[ai/draft] draft save skipped:', draftErr)
    }

    return NextResponse.json({ draft: text })
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      )
    }
    return toErrorResponse(err)
  }
}
