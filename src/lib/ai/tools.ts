import type { SupabaseClient } from '@supabase/supabase-js'
import type { ToolDefinition, ToolResult, ToolCall } from './types'

export const AI_TOOLS: ToolDefinition[] = [
  {
    name: 'update_contact_field',
    description:
      'Update a contact property or custom field. For built-in fields use the exact column name (name, email, company). ' +
      'For custom fields use the field name as configured in Settings > Fields & Tags.',
    parameters: {
      type: 'object',
      properties: {
        field: {
          type: 'string',
          description: 'Field name — one of: name, email, company, or a custom field name',
        },
        value: {
          type: 'string',
          description: 'New value for the field. Use empty string to clear it.',
        },
      },
      required: ['field', 'value'],
      additionalProperties: false,
    },
  },
  {
    name: 'add_tag',
    description: 'Add a tag to the contact. Creates the tag if it does not already exist.',
    parameters: {
      type: 'object',
      properties: {
        tag: {
          type: 'string',
          description: 'Tag name to add',
        },
      },
      required: ['tag'],
      additionalProperties: false,
    },
  },
  {
    name: 'remove_tag',
    description: 'Remove a tag from the contact.',
    parameters: {
      type: 'object',
      properties: {
        tag: {
          type: 'string',
          description: 'Tag name to remove',
        },
      },
      required: ['tag'],
      additionalProperties: false,
    },
  },
]

/** Known built-in contact columns that can be updated via update_contact_field. */
const BUILTIN_FIELDS = new Set(['name', 'email', 'company'])

interface ToolContext {
  db: SupabaseClient
  accountId: string
  contactId: string
}

/**
 * Execute a single tool call. Returns a human-readable result string
 * that is fed back to the model.
 */
async function executeToolCall(
  ctx: ToolContext,
  tool: ToolCall,
): Promise<string> {
  switch (tool.name) {
    case 'update_contact_field':
      return executeUpdateField(ctx, tool.arguments)
    case 'add_tag':
      return executeAddTag(ctx, tool.arguments)
    case 'remove_tag':
      return executeRemoveTag(ctx, tool.arguments)
    default:
      return `Error: unknown tool "${tool.name}"`
  }
}

async function executeUpdateField(
  ctx: ToolContext,
  args: Record<string, unknown>,
): Promise<string> {
  const field = String(args.field ?? '')
  const value = String(args.value ?? '')
  if (!field) return 'Error: field name is required'

  if (BUILTIN_FIELDS.has(field)) {
    const { error } = await ctx.db
      .from('contacts')
      .update({ [field]: value || null })
      .eq('id', ctx.contactId)
      .eq('account_id', ctx.accountId)
    if (error) return `Error updating ${field}: ${error.message}`
    return `Updated contact ${field} to "${value || '(cleared)'}"`
  }

  const { data: customField, error: lookupErr } = await ctx.db
    .from('custom_fields')
    .select('id')
    .eq('account_id', ctx.accountId)
    .eq('field_name', field)
    .maybeSingle()
  if (lookupErr) return `Error looking up custom field: ${lookupErr.message}`
  if (!customField) return `Error: no custom field named "${field}" found`

  const { error: upsertErr } = await ctx.db
    .from('contact_custom_values')
    .upsert(
      {
        contact_id: ctx.contactId,
        custom_field_id: customField.id,
        value: value || null,
      },
      { onConflict: 'contact_id, custom_field_id' },
    )
  if (upsertErr) return `Error updating custom field: ${upsertErr.message}`
  return `Updated custom field "${field}" to "${value || '(cleared)'}"`
}

async function executeAddTag(
  ctx: ToolContext,
  args: Record<string, unknown>,
): Promise<string> {
  const tagName = String(args.tag ?? '').trim()
  if (!tagName) return 'Error: tag name is required'

  const { data: existingTag } = await ctx.db
    .from('tags')
    .select('id')
    .eq('account_id', ctx.accountId)
    .eq('name', tagName)
    .maybeSingle()

  let tagId: string
  if (existingTag) {
    tagId = existingTag.id
  } else {
    const { data: newTag, error: createErr } = await ctx.db
      .from('tags')
      .insert({ account_id: ctx.accountId, name: tagName, color: '#6366f1' })
      .select('id')
      .maybeSingle()
    if (createErr) return `Error creating tag: ${createErr.message}`
    if (!newTag) return 'Error: tag was not created'
    tagId = newTag.id
  }

  const { error: linkErr } = await ctx.db
    .from('contact_tags')
    .insert({ contact_id: ctx.contactId, tag_id: tagId })
    .select()
    .maybeSingle()
  if (linkErr) {
    if (linkErr.code === '23505') return `Tag "${tagName}" is already applied`
    return `Error adding tag: ${linkErr.message}`
  }
  return `Added tag "${tagName}" to contact`
}

async function executeRemoveTag(
  ctx: ToolContext,
  args: Record<string, unknown>,
): Promise<string> {
  const tagName = String(args.tag ?? '').trim()
  if (!tagName) return 'Error: tag name is required'

  const { data: existingTag } = await ctx.db
    .from('tags')
    .select('id')
    .eq('account_id', ctx.accountId)
    .eq('name', tagName)
    .maybeSingle()
  if (!existingTag) return `Tag "${tagName}" not found — nothing to remove`

  const { error: delErr } = await ctx.db
    .from('contact_tags')
    .delete()
    .eq('contact_id', ctx.contactId)
    .eq('tag_id', existingTag.id)
  if (delErr) return `Error removing tag: ${delErr.message}`
  return `Removed tag "${tagName}" from contact`
}

/**
 * Execute a batch of tool calls in parallel and return results.
 */
export async function executeToolCalls(
  ctx: ToolContext,
  calls: ToolCall[],
): Promise<ToolResult[]> {
  return Promise.all(
    calls.map(async (call) => ({
      toolCallId: call.id,
      name: call.name,
      content: await executeToolCall(ctx, call),
    })),
  )
}
