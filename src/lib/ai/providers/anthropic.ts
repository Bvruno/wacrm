import {
  AiError,
  type ChatMessage,
  type ProviderResult,
  type ToolCall,
} from '../types'
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

interface AnthropicContentBlock {
  type?: string
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
}

interface AnthropicResponse {
  content?: AnthropicContentBlock[]
  stop_reason?: string
  usage?: { input_tokens?: number; output_tokens?: number }
}

/**
 * Anthropic's Messages API requires strictly alternating roles that
 * begin with `user`. Merge consecutive turns, then drop any leading
 * assistant turns (an agent greeting before the customer said anything)
 * so the transcript always starts on the customer. Guarantees a valid,
 * non-empty payload.
 */
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

function parseAnthropicToolCalls(
  content: AnthropicContentBlock[],
): ToolCall[] | undefined {
  const calls = content.filter((b) => b.type === 'tool_use' && b.id && b.name)
  if (calls.length === 0) return undefined
  return calls.map((b) => ({
    id: b.id!,
    name: b.name!,
    arguments: b.input ?? {},
  }))
}

/**
 * Call Anthropic's Messages endpoint with the caller's own key.
 * Supports tool-use when `tools` is provided.
 */
export async function generateAnthropic(args: ProviderArgs): Promise<ProviderResult> {
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

  const data = (await res.json().catch(() => null)) as AnthropicResponse | null
  const content = data?.content ?? []

  const toolCalls = parseAnthropicToolCalls(content)
  if (toolCalls && toolCalls.length > 0) {
    const text = content
      .filter((b) => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('')
    const usage = normalizeUsage({
      prompt: data?.usage?.input_tokens,
      completion: data?.usage?.output_tokens,
    })
    return { text: text || '', usage, toolCalls }
  }

  const text = content
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('')
    .trim()
  if (!text) {
    throw new AiError('Anthropic returned an empty response.', {
      code: 'empty_response',
    })
  }
  const usage = normalizeUsage({
    prompt: data?.usage?.input_tokens,
    completion: data?.usage?.output_tokens,
  })
  return { text, usage }
}
