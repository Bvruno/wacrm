import {
  AiError,
  type AiConfig,
  type AiUsage,
  type GenerateResult,
  type ToolCall,
  type ToolDefinition,
  type ToolResult,
} from './types'
import { HANDOFF_SENTINEL, aiRequestTimeoutMs } from './defaults'
import { generateOpenAi } from './providers/openai'
import { generateAnthropic } from './providers/anthropic'
import type { ProviderArgs } from './providers/shared'

/** Max tool-call rounds to prevent infinite loops. */
const MAX_TOOL_ROUNDS = 5

export interface GenerateArgs {
  config: AiConfig
  systemPrompt: string
  messages: ProviderArgs['messages']
  tools?: ToolDefinition[]
  executeTools?: (calls: ToolCall[]) => Promise<ToolResult[]>
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  maxTokens?: number
}

/**
 * Generate the next reply from the account's configured provider.
 *
 * When `tools` and `executeTools` are provided, runs a multi-turn
 * tool-calling loop: model → tool calls → execute → feed back → model,
 * up to `MAX_TOOL_ROUNDS` rounds, then returns the final text reply.
 */
export async function generateReply(args: GenerateArgs): Promise<GenerateResult> {
  const { config, systemPrompt, messages, tools, executeTools, temperature, topP, frequencyPenalty, presencePenalty, maxTokens } = args
  const timeoutMs = aiRequestTimeoutMs()
  const provider = config.provider

  const baseArgs: ProviderArgs = {
    apiKey: config.apiKey,
    model: config.model,
    systemPrompt,
    messages,
    timeoutMs,
    tools,
    temperature,
    topP,
    frequencyPenalty,
    presencePenalty,
    maxTokens,
  }

  let result = await callProvider(provider, baseArgs)
  let allUsage = result.usage

  // Breadcrumb string for logging — shows which tools were used.
  let toolTrace = ''

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const { toolCalls } = result
    if (!toolCalls || toolCalls.length === 0) break

    if (!executeTools) {
      // Tools defined but no executor — model wanted to call but can't.
      // Return the text content as-is (may be empty or a reasoning note).
      break
    }

    if (toolTrace) toolTrace += ' → '
    toolTrace += toolCalls.map((tc) => `${tc.name}(${JSON.stringify(tc.arguments)})`).join(', ')

    const toolResults = await executeTools(toolCalls)

    result = await callProvider(provider, {
      ...baseArgs,
      toolRound: {
        assistantContent: result.text,
        toolCalls,
        results: toolResults,
      },
    })

    // Accumulate usage across rounds.
    if (result.usage) {
      if (allUsage) {
        allUsage = {
          promptTokens: allUsage.promptTokens + result.usage.promptTokens,
          completionTokens: allUsage.completionTokens + result.usage.completionTokens,
          totalTokens: allUsage.totalTokens + result.usage.totalTokens,
        }
      } else {
        allUsage = result.usage
      }
    }
  }

  const parsed = parseGeneration(result.text, allUsage)

  if (toolTrace) {
    console.info(`[ai tools] ${toolTrace} → handoff=${parsed.handoff}`)
  }

  return parsed
}

function callProvider(provider: string, args: ProviderArgs) {
  switch (provider) {
    case 'openai':
      return generateOpenAi(args)
    case 'anthropic':
      return generateAnthropic(args)
    default:
      throw new AiError(`Unsupported AI provider: ${provider}`, {
        code: 'unsupported_provider',
        status: 400,
      })
  }
}

/**
 * Split the raw model output into `{ text, handoff, usage }`. The
 * sentinel can appear alone or trailing a partial reply; either way we
 * treat the turn as a handoff and strip the marker from any remaining
 * text. `usage` is passed straight through (null when the provider
 * didn't report it).
 */
export function parseGeneration(
  raw: string,
  usage: AiUsage | null = null,
): GenerateResult {
  const handoff = raw.includes(HANDOFF_SENTINEL)
  const text = raw.split(HANDOFF_SENTINEL).join('').trim()
  return { text, handoff, usage }
}
