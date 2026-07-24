import { AiError, type ProviderResult, type ToolCall } from '../types'
import { MAX_OUTPUT_TOKENS } from '../defaults'
import {
  mergeConsecutive,
  normalizeUsage,
  providerHttpError,
  toNetworkError,
  type ProviderArgs,
} from './shared'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

interface OpenAiToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

interface OpenAiChoice {
  message?: {
    content?: string | null
    tool_calls?: OpenAiToolCall[]
  }
}

interface OpenAiResponse {
  choices?: OpenAiChoice[]
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

function toOpenAiTools(
  tools: NonNullable<ProviderArgs['tools']>,
): { type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))
}

function parseToolCalls(raw: OpenAiToolCall[]): ToolCall[] {
  return raw.map((tc) => {
    let parsed: Record<string, unknown> = {}
    try {
      parsed = JSON.parse(tc.function.arguments)
    } catch {
      // Invalid JSON from the model — pass empty args
    }
    return { id: tc.id, name: tc.function.name, arguments: parsed }
  })
}

/**
 * Call OpenAI's Chat Completions endpoint with the caller's own key.
 * Supports tool-use (function-calling) when `tools` is provided.
 */
export async function generateOpenAi(args: ProviderArgs): Promise<ProviderResult> {
  const { apiKey, model, systemPrompt, messages, timeoutMs, tools, toolRound, temperature, topP, frequencyPenalty, presencePenalty, maxTokens } = args

  const bodyMessages: Record<string, unknown>[] = [
    { role: 'system', content: systemPrompt },
    ...mergeConsecutive(messages),
  ]

  if (toolRound) {
    bodyMessages.push({
      role: 'assistant',
      content: toolRound.assistantContent || null,
      tool_calls: toolRound.toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments),
        },
      })),
    })
    for (const r of toolRound.results) {
      bodyMessages.push({
        role: 'tool',
        tool_call_id: r.toolCallId,
        content: r.content,
      })
    }
  }

  const body: Record<string, unknown> = {
    model,
    messages: bodyMessages,
    max_completion_tokens: maxTokens ?? MAX_OUTPUT_TOKENS,
  }
  if (tools && tools.length > 0) {
    body.tools = toOpenAiTools(tools)
  }
  if (temperature !== undefined) body.temperature = temperature
  if (topP !== undefined) body.top_p = topP
  if (frequencyPenalty !== undefined) body.frequency_penalty = frequencyPenalty
  if (presencePenalty !== undefined) body.presence_penalty = presencePenalty

  let res: Response
  try {
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    throw toNetworkError(err)
  }

  if (!res.ok) {
    throw await providerHttpError('OpenAI', res)
  }

  const data = (await res.json().catch(() => null)) as OpenAiResponse | null
  const msg = data?.choices?.[0]?.message
  const text = msg?.content ?? ''

  const usage = normalizeUsage({
    prompt: data?.usage?.prompt_tokens,
    completion: data?.usage?.completion_tokens,
    total: data?.usage?.total_tokens,
  })

  // Tool calls take precedence — when the model requests tools, content
  // is typically null or a reasoning preamble.
  const toolCalls = msg?.tool_calls ? parseToolCalls(msg.tool_calls) : undefined
  if (toolCalls && toolCalls.length > 0) {
    return { text: text || '', usage, toolCalls }
  }

  if (!text || !text.trim()) {
    throw new AiError('OpenAI returned an empty response.', {
      code: 'empty_response',
    })
  }
  return { text, usage }
}
