import { NextRequest, NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { getDefaultAgent } from '@/lib/agents/agents'
import { retrieveKnowledge } from '@/lib/ai/knowledge'
import { generateReply, generateReplyStream } from '@/lib/ai/generate'
import { buildSystemPrompt } from '@/lib/ai/defaults'
import { latestUserMessage } from '@/lib/ai/query'
import { AiError, type ChatMessage } from '@/lib/ai/types'
import { getToneInstructions } from '@/lib/ai/tone-presets'

const MAX_TURNS = 20

export async function POST(request: NextRequest) {
  try {
    const { supabase, accountId, userId } = await requireRole('agent')

    const limit = checkRateLimit(`ai-playground:${userId}`, RATE_LIMITS.aiDraft)
    if (!limit.success) return rateLimitResponse(limit)

    const body = await request.json().catch(() => null)
    const rawMessages = Array.isArray(body?.messages) ? body.messages : null
    if (!rawMessages) {
      return NextResponse.json({ error: 'messages is required' }, { status: 400 })
    }

    const stream = body?.stream === true

    const messages: ChatMessage[] = rawMessages
      .filter(
        (m: unknown): m is ChatMessage =>
          !!m &&
          typeof m === 'object' &&
          ((m as ChatMessage).role === 'user' ||
            (m as ChatMessage).role === 'assistant') &&
          typeof (m as ChatMessage).content === 'string' &&
          (m as ChatMessage).content.trim().length > 0,
      )
      .slice(-MAX_TURNS)

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'Send a message to test the agent.' },
        { status: 400 },
      )
    }

    const config = await getDefaultAgent(supabase, accountId, {
      requireActive: false,
    }).catch((err) => {
      console.error('[ai/playground] getDefaultAgent error:', err)
      throw new AiError('Stored API key could not be decrypted.', {
        code: 'key_decrypt_failed',
        status: 400,
      })
    })
    if (!config) {
      return NextResponse.json(
        {
          error: 'No agent configured yet. Add your provider key in Setup.',
          code: 'ai_not_configured',
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

    const toneInstructions = getToneInstructions(config.tonePreset)

    const systemPrompt = buildSystemPrompt({
      userPrompt: config.systemPrompt,
      mode: 'auto_reply',
      knowledge,
      toneInstructions,
      customToneInstructions: config.customToneInstructions,
    })

    const generateArgs = {
      config: aiConfig,
      systemPrompt,
      messages,
      temperature: config.temperature,
      topP: config.topP,
      frequencyPenalty: config.frequencyPenalty,
      presencePenalty: config.presencePenalty,
      maxTokens: config.maxTokens,
    }

    if (stream) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            await generateReplyStream(generateArgs, {
              onToken: (token) => {
                const data = `data: ${JSON.stringify({ type: 'token', content: token })}\n\n`
                controller.enqueue(encoder.encode(data))
              },
              onToolCall: (toolCalls) => {
                const data = `data: ${JSON.stringify({ type: 'tool_calls', tool_calls: toolCalls })}\n\n`
                controller.enqueue(encoder.encode(data))
              },
              onEnd: (usage) => {
                const data = `data: ${JSON.stringify({ type: 'end', usage })}\n\n`
                controller.enqueue(encoder.encode(data))
                controller.close()
              },
              onError: (error) => {
                const data = `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
                controller.enqueue(encoder.encode(data))
                controller.close()
              },
            })
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'
            const data = `data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`
            controller.enqueue(encoder.encode(data))
            controller.close()
          }
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    const { text, handoff } = await generateReply(generateArgs)
    return NextResponse.json({ reply: text, handoff })
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
