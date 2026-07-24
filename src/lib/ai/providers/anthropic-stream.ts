import { AiError, type ChatMessage, type ToolCall } from '../types'
import { MAX_OUTPUT_TOKENS } from '../defaults'
import {
  mergeConsecutive,
  normalizeUsage,
  providerHttpError,
  toNetworkError,
  type ProviderArgs,
} from './shared'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

interface StreamCallbacks {
  onToken: (token: string) => void
  onToolCall?: (toolCalls: ToolCall[]) => void
  onEnd: (usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null) => void
  onError: (error: Error) => void
}

function normalizeForAnthropic(messages: ChatMessage[]): ChatMessage[] {
  const merged = mergeConsecutive(messages)
  while (merged.length > 0 && merged[0].role === 'assistant') {
    merged.shift()
  }
  if (merged.length === 0) {
    return [{ role: 'user', content: '(The customer has not sent a message yet.)' }]
  }
  return merged
}

function toAnthropicTools(
  tools: NonNullable<ProviderArgs['tools']>,
): { name: string; description: string; input_schema: Record<string, unknown> }[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }))
}

export async function generateAnthropicStream(
  args: ProviderArgs,
  callbacks: StreamCallbacks,
): Promise<void> {
  const { apiKey, model, systemPrompt, messages, timeoutMs, tools, toolRound, temperature, topP, maxTokens } = args

  const bodyMessages: unknown[] = normalizeForAnthropic(messages)

  if (toolRound) {
    bodyMessages.push({
      role: 'assistant',
      content: [
        ...(toolRound.assistantContent
          ? [{ type: 'text' as const, text: toolRound.assistantContent }]
          : []),
        ...toolRound.toolCalls.map((tc) => ({
          type: 'tool_use' as const,
          id: tc.id,
          name: tc.name,
          input: tc.arguments,
        })),
      ],
    })
    bodyMessages.push({
      role: 'user',
      content: toolRound.results.map((r) => ({
        type: 'tool_result' as const,
        tool_use_id: r.toolCallId,
        content: r.content,
      })),
    })
  }

  const body: Record<string, unknown> = {
    model,
    system: systemPrompt,
    max_tokens: maxTokens ?? MAX_OUTPUT_TOKENS,
    messages: bodyMessages,
    stream: true,
  }
  if (tools && tools.length > 0) {
    body.tools = toAnthropicTools(tools)
  }
  if (temperature !== undefined) body.temperature = temperature
  if (topP !== undefined) body.top_p = topP

  let res: Response
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    throw toNetworkError(err)
  }

  if (!res.ok) {
    throw await providerHttpError('Anthropic', res)
  }

  if (!res.body) {
    throw new AiError('Anthropic returned no response body.', {
      code: 'empty_response',
    })
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const toolCalls: ToolCall[] = []
  let inputTokens = 0
  let outputTokens = 0

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
        try {
          const parsed = JSON.parse(data) as {
            type: string
            delta?: { type: string; text?: string; partial_json?: string }
            index?: number
            id?: string
            name?: string
            usage?: { input_tokens?: number; output_tokens?: number }
          }

          if (parsed.type === 'content_block_delta') {
            if (parsed.delta?.type === 'text_delta' && parsed.delta.text) {
              callbacks.onToken(parsed.delta.text)
            }
            if (parsed.delta?.type === 'input_json_delta' && parsed.delta.partial_json) {
              const tc = toolCalls[parsed.index!]
              if (tc) {
                tc.arguments = {
                  ...tc.arguments,
                  ...JSON.parse(parsed.delta.partial_json || '{}'),
                }
              }
            }
          } else if (parsed.type === 'content_block_start') {
            const pb = parsed as unknown as { content_block?: { type: string; id?: string; name?: string } }
            if (parsed.index !== undefined && pb.content_block?.type === 'tool_use') {
              const block = pb.content_block
              toolCalls[parsed.index] = {
                id: block.id || '',
                name: block.name || '',
                arguments: {},
              }
            }
          } else if (parsed.type === 'message_delta') {
            if (parsed.usage) {
              outputTokens = parsed.usage.output_tokens || outputTokens
            }
          } else if (parsed.type === 'message_start') {
            if (parsed.usage) {
              inputTokens = parsed.usage.input_tokens || inputTokens
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

  if (toolCalls.length > 0 && callbacks.onToolCall) {
    callbacks.onToolCall(toolCalls.filter(tc => tc.id && tc.name))
  }

  const usage = normalizeUsage({
    prompt: inputTokens,
    completion: outputTokens,
  })
  callbacks.onEnd(usage)
}
