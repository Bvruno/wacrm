import type { SupabaseClient } from '@supabase/supabase-js'
import { decrypt, encrypt } from '@/lib/whatsapp/encryption'
import type { Agent, AiProvider, TonePreset } from '@/types'
import type { AgentConfig } from '@/lib/ai/types'

interface AgentRow {
  id: string
  account_id: string
  created_by: string | null
  name: string
  description: string | null
  avatar_url: string | null
  provider: AiProvider
  model: string
  api_key: string
  system_prompt: string | null
  temperature: number
  top_p: number
  frequency_penalty: number
  presence_penalty: number
  max_tokens: number
  tone_preset: TonePreset | null
  custom_tone_instructions: string | null
  language: string | null
  is_active: boolean
  auto_reply_enabled: boolean
  auto_reply_max_per_conversation: number
  handoff_agent_id: string | null
  embeddings_api_key: string | null
  created_at: string
  updated_at: string
}

const AGENT_COLUMNS = `
  id, account_id, created_by, name, description, avatar_url,
  provider, model, api_key, system_prompt,
  temperature, top_p, frequency_penalty, presence_penalty, max_tokens,
  tone_preset, custom_tone_instructions, language,
  is_active, auto_reply_enabled, auto_reply_max_per_conversation,
  handoff_agent_id, embeddings_api_key,
  created_at, updated_at
`

function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    account_id: row.account_id,
    created_by: row.created_by,
    name: row.name,
    description: row.description,
    avatar_url: row.avatar_url,
    provider: row.provider,
    model: row.model,
    system_prompt: row.system_prompt,
    temperature: row.temperature,
    top_p: row.top_p,
    frequency_penalty: row.frequency_penalty,
    presence_penalty: row.presence_penalty,
    max_tokens: row.max_tokens,
    tone_preset: row.tone_preset,
    custom_tone_instructions: row.custom_tone_instructions,
    language: row.language,
    is_active: row.is_active,
    auto_reply_enabled: row.auto_reply_enabled,
    auto_reply_max_per_conversation: row.auto_reply_max_per_conversation,
    handoff_agent_id: row.handoff_agent_id,
    embeddings_api_key: row.embeddings_api_key,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function rowToAgentConfig(row: AgentRow): AgentConfig {
  return {
    id: row.id,
    accountId: row.account_id,
    provider: row.provider,
    model: row.model,
    apiKey: decrypt(row.api_key),
    systemPrompt: row.system_prompt,
    temperature: row.temperature,
    topP: row.top_p,
    frequencyPenalty: row.frequency_penalty,
    presencePenalty: row.presence_penalty,
    maxTokens: row.max_tokens,
    tonePreset: row.tone_preset,
    customToneInstructions: row.custom_tone_instructions,
    language: row.language,
    isActive: row.is_active,
    autoReplyEnabled: row.auto_reply_enabled,
    autoReplyMaxPerConversation: row.auto_reply_max_per_conversation,
    handoffAgentId: row.handoff_agent_id,
    embeddingsApiKey: row.embeddings_api_key
      ? (() => {
          try {
            return decrypt(row.embeddings_api_key!)
          } catch {
            return null
          }
        })()
      : null,
  }
}

export async function listAgents(
  db: SupabaseClient,
  accountId: string,
): Promise<Agent[]> {
  const { data, error } = await db
    .from('agents')
    .select(AGENT_COLUMNS)
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as AgentRow[]).map(rowToAgent)
}

export async function getAgent(
  db: SupabaseClient,
  agentId: string,
): Promise<Agent | null> {
  const { data, error } = await db
    .from('agents')
    .select(AGENT_COLUMNS)
    .eq('id', agentId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return rowToAgent(data as AgentRow)
}

export async function getAgentConfig(
  db: SupabaseClient,
  agentId: string,
  opts: { requireActive?: boolean } = {},
): Promise<AgentConfig | null> {
  const { requireActive = true } = opts
  const { data, error } = await db
    .from('agents')
    .select(AGENT_COLUMNS)
    .eq('id', agentId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as AgentRow
  if (requireActive && !row.is_active) return null
  if (!row.api_key) return null

  return rowToAgentConfig(row)
}

export async function getDefaultAgent(
  db: SupabaseClient,
  accountId: string,
  opts: { requireActive?: boolean } = {},
): Promise<AgentConfig | null> {
  const { requireActive = true } = opts
  const { data, error } = await db
    .from('agents')
    .select(AGENT_COLUMNS)
    .eq('account_id', accountId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as AgentRow
  if (requireActive && !row.is_active) return null
  if (!row.api_key) return null

  return rowToAgentConfig(row)
}

export interface CreateAgentInput {
  name: string
  description?: string | null
  avatar_url?: string | null
  provider: AiProvider
  model: string
  api_key: string
  system_prompt?: string | null
  temperature?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  max_tokens?: number
  tone_preset?: TonePreset | null
  custom_tone_instructions?: string | null
  language?: string | null
  is_active?: boolean
  auto_reply_enabled?: boolean
  auto_reply_max_per_conversation?: number
  handoff_agent_id?: string | null
  embeddings_api_key?: string | null
}

export async function createAgent(
  db: SupabaseClient,
  accountId: string,
  userId: string,
  input: CreateAgentInput,
): Promise<Agent> {
  const encryptedKey = encrypt(input.api_key)
  const encryptedEmbeddingsKey = input.embeddings_api_key
    ? encrypt(input.embeddings_api_key)
    : null

  const { data, error } = await db
    .from('agents')
    .insert({
      account_id: accountId,
      created_by: userId,
      name: input.name,
      description: input.description ?? null,
      avatar_url: input.avatar_url ?? null,
      provider: input.provider,
      model: input.model,
      api_key: encryptedKey,
      system_prompt: input.system_prompt ?? null,
      temperature: input.temperature ?? 0.7,
      top_p: input.top_p ?? 1.0,
      frequency_penalty: input.frequency_penalty ?? 0,
      presence_penalty: input.presence_penalty ?? 0,
      max_tokens: input.max_tokens ?? 1024,
      tone_preset: input.tone_preset ?? null,
      custom_tone_instructions: input.custom_tone_instructions ?? null,
      language: input.language ?? null,
      is_active: input.is_active ?? false,
      auto_reply_enabled: input.auto_reply_enabled ?? false,
      auto_reply_max_per_conversation:
        input.auto_reply_max_per_conversation ?? 3,
      handoff_agent_id: input.handoff_agent_id ?? null,
      embeddings_api_key: encryptedEmbeddingsKey,
    })
    .select(AGENT_COLUMNS)
    .single()

  if (error) throw error
  return rowToAgent(data as AgentRow)
}

export interface UpdateAgentInput {
  name?: string
  description?: string | null
  avatar_url?: string | null
  provider?: AiProvider
  model?: string
  api_key?: string
  system_prompt?: string | null
  temperature?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  max_tokens?: number
  tone_preset?: TonePreset | null
  custom_tone_instructions?: string | null
  language?: string | null
  is_active?: boolean
  auto_reply_enabled?: boolean
  auto_reply_max_per_conversation?: number
  handoff_agent_id?: string | null
  embeddings_api_key?: string | null
}

export async function updateAgent(
  db: SupabaseClient,
  agentId: string,
  input: UpdateAgentInput,
): Promise<Agent> {
  const updates: Record<string, unknown> = {}

  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.avatar_url !== undefined) updates.avatar_url = input.avatar_url
  if (input.provider !== undefined) updates.provider = input.provider
  if (input.model !== undefined) updates.model = input.model
  if (input.api_key !== undefined) updates.api_key = encrypt(input.api_key)
  if (input.system_prompt !== undefined) updates.system_prompt = input.system_prompt
  if (input.temperature !== undefined) updates.temperature = input.temperature
  if (input.top_p !== undefined) updates.top_p = input.top_p
  if (input.frequency_penalty !== undefined)
    updates.frequency_penalty = input.frequency_penalty
  if (input.presence_penalty !== undefined)
    updates.presence_penalty = input.presence_penalty
  if (input.max_tokens !== undefined) updates.max_tokens = input.max_tokens
  if (input.tone_preset !== undefined) updates.tone_preset = input.tone_preset
  if (input.custom_tone_instructions !== undefined)
    updates.custom_tone_instructions = input.custom_tone_instructions
  if (input.language !== undefined) updates.language = input.language
  if (input.is_active !== undefined) updates.is_active = input.is_active
  if (input.auto_reply_enabled !== undefined)
    updates.auto_reply_enabled = input.auto_reply_enabled
  if (input.auto_reply_max_per_conversation !== undefined)
    updates.auto_reply_max_per_conversation = input.auto_reply_max_per_conversation
  if (input.handoff_agent_id !== undefined)
    updates.handoff_agent_id = input.handoff_agent_id
  if (input.embeddings_api_key !== undefined)
    updates.embeddings_api_key = input.embeddings_api_key
      ? encrypt(input.embeddings_api_key)
      : null

  const { data, error } = await db
    .from('agents')
    .update(updates)
    .eq('id', agentId)
    .select(AGENT_COLUMNS)
    .single()

  if (error) throw error
  return rowToAgent(data as AgentRow)
}

export async function deleteAgent(
  db: SupabaseClient,
  agentId: string,
): Promise<void> {
  const { error } = await db.from('agents').delete().eq('id', agentId)
  if (error) throw error
}

export async function duplicateAgent(
  db: SupabaseClient,
  agentId: string,
  newName: string,
): Promise<Agent> {
  const original = await getAgent(db, agentId)
  if (!original) throw new Error('Agent not found')

  const { data, error } = await db
    .from('agents')
    .insert({
      account_id: original.account_id,
      name: newName,
      description: `Copia de ${original.name}`,
      avatar_url: original.avatar_url,
      provider: original.provider,
      model: original.model,
      api_key: original.provider === 'openai' ? encrypt('') : encrypt(''),
      system_prompt: original.system_prompt,
      temperature: original.temperature,
      top_p: original.top_p,
      frequency_penalty: original.frequency_penalty,
      presence_penalty: original.presence_penalty,
      max_tokens: original.max_tokens,
      tone_preset: original.tone_preset,
      custom_tone_instructions: original.custom_tone_instructions,
      language: original.language,
      is_active: false,
      auto_reply_enabled: false,
      auto_reply_max_per_conversation: original.auto_reply_max_per_conversation,
      handoff_agent_id: original.handoff_agent_id,
      embeddings_api_key: original.embeddings_api_key,
    })
    .select(AGENT_COLUMNS)
    .single()

  if (error) throw error
  return rowToAgent(data as AgentRow)
}
