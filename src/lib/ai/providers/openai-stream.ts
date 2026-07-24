import { AiError, type ToolCall } from '../types'
import { MAX_OUTPUT_TOKENS } from '../defaults'
import {
  mergeConsecutive,
  normalizeUsage,
  providerHttpError,
  toNetworkError,
  type ProviderArgs,
} from './shared'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

interface OpenAiStreamDelta {
  choices?: {
    delta?: {
      content?: string | null
      tool_calls?: {
        index: number
        id?: string
        type?: string
        function?: {
          name?: string
          arguments?: string
        }
      }[]
    }
  }[]
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

interface StreamCallbacks {
  onToken: (token: string) => void
  onToolCall?: (toolCalls: ToolCall[]) => void
  onEnd: (usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null) => void
  onError: (error: Error) => void
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

export async function generateOpenAiStream(
  args: ProviderArgs,
  callbacks: StreamCallbacks,
): Promise<void> {
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
    stream: true,
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

  if (!res.body) {
    throw new AiError('OpenAI returned no response body.', {
      code: 'empty_response',
    })
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const toolCallAccumulator = new Map<number, { id: string; name: string; arguments: string }>()
  let usage = null

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          const parsedCalls = Array.from(toolCallAccumulator.values()).map((tc) => {
            let parsed: Record<string, unknown> = {}
            try {
              parsed = JSON.parse(tc.arguments)
            } catch {
              // Invalid JSON from the model
            }
            return { id: tc.id, name: tc.name, arguments: parsed }
          })
          if (parsedCalls.length > 0 && callbacks.onToolCall) {
            callbacks.onToolCall(parsedCalls)
          }
          callbacks.onEnd(usage)
          return
        }

        try {
          const parsed = JSON.parse(data) as OpenAiStreamDelta

          if (parsed.usage) {
            usage = normalizeUsage({
              prompt: parsed.usage.prompt_tokens,
              completion: parsed.usage.completion_tokens,
              total: parsed.usage.total_tokens,
            })
          }

          const delta = parsed.choices?.[0]?.delta
          if (!delta) continue

          if (delta.content) {
            callbacks.onToken(delta.content)
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const existing = toolCallAccumulator.get(tc.index) || {
                id: '',
                name: '',
                arguments: '',
              }
              if (tc.id) existing.id = tc.id
              if (tc.function?.name) existing.name = tc.function.name
              if (tc.function?.arguments) existing.arguments += tc.function.arguments
              toolCallAccumulator.set(tc.index, existing)
            }
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)))
    return
  }

  callbacks.onEnd(usage)
}
