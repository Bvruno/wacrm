'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchConversations } from '@/lib/inbox/fetch-conversations'
import type { Conversation, ConversationStatus } from '@/types'

interface UseConversationsPaginatedOptions {
  initialLimit?: number
  status?: ConversationStatus | 'all' | 'unread'
  search?: string
}

interface UseConversationsPaginatedResult {
  conversations: Conversation[]
  loading: boolean
  hasMore: boolean
  loadMore: () => void
  refresh: () => void
  setStatus: (status: ConversationStatus | 'all' | 'unread') => void
  setSearch: (search: string) => void
}

export function useConversationsPaginated(
  options?: UseConversationsPaginatedOptions,
): UseConversationsPaginatedResult {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [status, setStatus] = useState<ConversationStatus | 'all' | 'unread'>(
    options?.status ?? 'all',
  )
  const [search, setSearch] = useState(options?.search ?? '')
  // Debounce timer for search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const limit = options?.initialLimit ?? 50

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (!append) setLoading(true)
      else setLoadingMore(true)

      try {
        const result = await fetchConversations({
          limit,
          cursor: cursor ?? undefined,
          status,
          search,
        })

        if (append) {
          setConversations((prev) => {
            const existingIds = new Set(prev.map((c) => c.id))
            const newOnes = result.data.filter((c) => !existingIds.has(c.id))
            return [...prev, ...newOnes]
          })
        } else {
          setConversations(result.data)
        }

        setNextCursor(result.nextCursor)
      } catch (err) {
        console.error('Failed to fetch conversations:', err)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [limit, status, search],
  )

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchPage(null, false)
  }, [fetchPage])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchPage(null, false)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // We intentionally only react to search changes here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const loadMore = useCallback(() => {
    if (!loadingMore && nextCursor) {
      fetchPage(nextCursor, true)
    }
  }, [loadingMore, nextCursor, fetchPage])

  const refresh = useCallback(() => {
    fetchPage(null, false)
  }, [fetchPage])

  const handleSetStatus = useCallback(
    (newStatus: ConversationStatus | 'all' | 'unread') => {
      setStatus(newStatus)
      setConversations([])
      setNextCursor(null)
    },
    [],
  )

  const handleSetSearch = useCallback((newSearch: string) => {
    setSearch(newSearch)
    setConversations([])
    setNextCursor(null)
  }, [])

  return {
    conversations,
    loading,
    hasMore: nextCursor !== null,
    loadMore,
    refresh,
    setStatus: handleSetStatus,
    setSearch: handleSetSearch,
  }
}
