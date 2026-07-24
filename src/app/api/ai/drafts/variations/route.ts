import { NextRequest, NextResponse } from 'next/server'
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
import { AiError } from '@/lib/ai/types'
import { getToneInstructions, TONE_PRESETS, type TonePresetConfig } from '@/lib/ai/tone-presets'
import type { TonePreset } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const userLimit = checkRateLimit(`ai-variations:${userId}`, RATE_LIMITS.aiDraft)
    if (!userLimit.success) return rateLimitResponse(userLimit)

    const body = await request.json().catch(() => null)
    const conversationId =
      body && typeof body.conversation_id === 'string' ? body.conversation_id : ''
    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 },
      )
    }

    const { data: conversation, error: convErr } = await supabase
      .from('conversations')
      .select('id, contact_id')
      .eq('id', conversationId)
      .maybeSingle()
    if (convErr || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const config = await getDefaultAgent(supabase, accountId)
    if (!config) {
      return NextResponse.json(
        { error: 'AI assistant is not set up.', code: 'ai_not_configured' },
        { status: 400 },
      )
    }

    const messages = await buildConversationContext(supabase, conversationId)
    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages to draft from yet.', code: 'no_messages' },
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

    const tonePresets = Object.values(TONE_PRESETS) as TonePresetConfig[]
    const selectedPresets = tonePresets.slice(0, 3)

    const variations = await Promise.all(
      selectedPresets.map(async (preset) => {
        const toneInstructions = getToneInstructions(preset.value as TonePreset)
        const systemPrompt = buildSystemPrompt({
          userPrompt: config.systemPrompt,
          mode: 'draft',
          knowledge,
          contactProfile,
          toneInstructions,
          customToneInstructions: config.customToneInstructions,
        })

        const contactId = conversation.contact_id
        const { text } = await generateReply({
          config: aiConfig,
          systemPrompt,
          messages,
          tools: AI_TOOLS,
          executeTools: contactId
            ? (calls) =>
                executeToolCalls({ db: supabase, accountId, contactId }, calls)
            : undefined,
          temperature: preset.temperature,
          topP: config.topP,
          frequencyPenalty: config.frequencyPenalty,
          presencePenalty: config.presencePenalty,
          maxTokens: config.maxTokens,
        })

        return {
          tone: preset.value,
          toneLabel: preset.label,
          draft: text,
        }
      }),
    )

    try {
      for (const v of variations) {
        await supabase.from('ai_drafts').insert({
          account_id: accountId,
          conversation_id: conversationId,
          created_by: userId,
          draft_text: v.draft,
          context_used: {
            knowledge_count: knowledge.length,
            contact_profile: contactProfile || null,
            tone_preset: v.tone,
          },
          parameters: {
            temperature: selectedPresets.find(p => p.value === v.tone)?.temperature ?? config.temperature,
            tone_preset: v.tone,
          },
        })
      }
    } catch {
      // Best-effort save
    }

    return NextResponse.json({ variations })
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
