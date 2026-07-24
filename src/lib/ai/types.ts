// ============================================================
// Shared types for the AI reply assistant (bring-your-own-key).
//
// One small provider-agnostic surface so the inbox draft route and the
// inbound auto-reply bot both talk to `generateReply` without caring
// whether the account is on OpenAI or Anthropic.
// ============================================================

import type { TonePreset } from '@/types'

export type AiProvider = 'openai' | 'anthropic'

export interface AiConfig {
  provider: AiProvider
  model: string
  apiKey: string
  systemPrompt: string | null
  isActive: boolean
  autoReplyEnabled: boolean
  autoReplyMaxPerConversation: number
  handoffAgentId: string | null
  embeddingsApiKey: string | null
}

export interface AgentConfig {
  id: string
  accountId: string
  provider: AiProvider
  model: string
  apiKey: string
  systemPrompt: string | null
  temperature: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  maxTokens: number
  tonePreset: TonePreset | null
  customToneInstructions: string | null
  language: string | null
  isActive: boolean
  autoReplyEnabled: boolean
  autoReplyMaxPerConversation: number
  handoffAgentId: string | null
  embeddingsApiKey: string | null
}

/** A single conversation turn in the shape both providers accept. */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Token counts for one provider call, normalized across OpenAI
 * (`prompt`/`completion`) and Anthropic (`input`/`output`). Null when
 * the provider didn't return usage. Logged to `ai_usage_log`.
 */
export interface AiUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/** Raw text + usage a provider adapter returns before handoff parsing. */
export interface ProviderResult {
  text: string
  usage: AiUsage | null
  toolCalls?: ToolCall[]
}

/** Outcome of a generation call. */
export interface GenerateResult {
  /** The reply text, with any handoff sentinel stripped. */
  text: string
  /** True when the model asked to hand off to a human (auto-reply mode). */
  handoff: boolean
  /** Provider token usage for this call, or null when unavailable. */
  usage: AiUsage | null
}

/**
 * Typed error for every AI failure mode. `status` maps cleanly to an
 * HTTP response in the draft route; `code` lets the UI/tests branch
 * (invalid_key vs rate_limited vs timeout, etc.).
 */
/**
 * Schema for a tool the model can invoke (function-calling).
 * Uses JSON Schema for parameter validation.
 */
export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

/** A single tool-call request from the model. */
export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

/** Result of executing a tool call. */
export interface ToolResult {
  toolCallId: string
  name: string
  content: string
}

export class AiError extends Error {
  readonly code: string
  readonly status: number
  constructor(message: string, opts: { code?: string; status?: number } = {}) {
    super(message)
    this.name = 'AiError'
    this.code = opts.code ?? 'ai_error'
    this.status = opts.status ?? 502
  }
}
