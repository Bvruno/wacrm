'use server'

import { createClient } from '@/lib/supabase/server'
import {
  CONVERSATION_SELECT,
  normalizeConversations,
} from '@/lib/inbox/conversations'
import {
  encodeCursor,
  decodeCursor,
  keysetFilter,
  buildPage,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '@/lib/api/v1/pagination'
import type { Conversation, ConversationStatus } from '@/types'

export interface FetchConversationsParams {
  limit?: number
  cursor?: string
  status?: ConversationStatus | 'all' | 'unread'
  search?: string
}

export interface FetchConversationsResult {
  data: Conversation[]
  nextCursor: string | null
}

export async function fetchConversations(
  params: FetchConversationsParams,
): Promise<FetchConversationsResult> {
  const supabase = await createClient()

  const limit = params.limit
    ? Math.min(Math.max(1, Math.floor(params.limit)), MAX_LIMIT)
    : DEFAULT_LIMIT

  const cursor = params.cursor ? decodeCursor(params.cursor) : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  // Status filter
  if (params.status && params.status !== 'all') {
    if (params.status === 'unread') {
      query = query.gt('unread_count', 0)
    } else {
      query = query.eq('status', params.status)
    }
  }

  // Text search — uses PostgREST's `ilike` on contact name, phone, and last message text.
  // Because the join is via CONVERSATION_SELECT, we filter on conversation-level columns
  // and apply contact-level search after the fetch.
  if (params.search?.trim()) {
    // We do a coarse server-side filter on last_message_text (cheap, indexed-able)
    // and then refine client-side on contact.name/phone
    query = query.ilike('last_message_text', `%${params.search.trim()}%`)
  }

  // Apply cursor filter
  const kf = keysetFilter(cursor)
  if (kf) {
    query = query.or(kf)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch conversations:', error)
    return { data: [], nextCursor: null }
  }

  const convs = normalizeConversations(data ?? [])
  const { items, nextCursor } = buildPage(convs, limit)

  // If there was a text search, also filter by contact name/phone client-side
  // since we can't ilike on joined fields in a single query with cursor pagination.
  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase()
    const filtered = items.filter((c: Conversation) => {
      const name = c.contact?.name?.toLowerCase() ?? ''
      const phone = c.contact?.phone?.toLowerCase() ?? ''
      const lastMsg = c.last_message_text?.toLowerCase() ?? ''
      return (
        name.includes(q) || phone.includes(q) || lastMsg.includes(q)
      )
    })
    return { data: filtered, nextCursor }
  }

  return { data: items, nextCursor }
}
