import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  loadActivity,
  loadConversationsSeries,
  loadMetrics,
  loadPipelineDonut,
  loadResponseTime,
} from './queries'

function mockDb(result: unknown): SupabaseClient {
  return {
    rpc: () => Promise.resolve({ data: result, error: null }),
  } as unknown as SupabaseClient
}

describe('loadMetrics', () => {
  it('parses a valid metrics bundle from RPC JSON', async () => {
    const raw = {
      activeConversations: { current: 12, previous: 3 },
      newContactsToday: { current: 5, previous: 2 },
      openDealsValue: 45000,
      openDealsCount: 8,
      messagesSentToday: { current: 23, previous: 18 },
    }
    const result = await loadMetrics(mockDb(raw), 'acct-1')
    expect(result.activeConversations).toEqual({ current: 12, previous: 3 })
    expect(result.newContactsToday).toEqual({ current: 5, previous: 2 })
    expect(result.openDealsValue).toBe(45000)
    expect(result.openDealsCount).toBe(8)
    expect(result.messagesSentToday).toEqual({ current: 23, previous: 18 })
  })

  it('coerces null values to 0', async () => {
    const raw = {
      activeConversations: { current: 0, previous: 0 },
      newContactsToday: { current: null, previous: null },
      openDealsValue: null,
      openDealsCount: null,
      messagesSentToday: { current: 0, previous: 0 },
    }
    const result = await loadMetrics(mockDb(raw), 'acct-1')
    expect(result.openDealsValue).toBe(0)
    expect(result.openDealsCount).toBe(0)
    expect(result.newContactsToday.current).toBe(0)
  })
})

describe('loadConversationsSeries', () => {
  it('returns an empty array for null data', async () => {
    const result = await loadConversationsSeries(mockDb(null), 'acct-1', 30)
    expect(result).toEqual([])
  })

  it('parses valid series points', async () => {
    const raw = [
      { day: '2026-05-01', incoming: 3, outgoing: 5 },
      { day: '2026-05-02', incoming: 1, outgoing: 2 },
    ]
    const result = await loadConversationsSeries(mockDb(raw), 'acct-1', 30)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ day: '2026-05-01', incoming: 3, outgoing: 5 })
  })
})

describe('loadPipelineDonut', () => {
  it('returns empty stages when data is null', async () => {
    const result = await loadPipelineDonut(mockDb(null), 'acct-1')
    expect(result.stages).toEqual([])
    expect(result.totalValue).toBe(0)
  })

  it('parses stages with deals', async () => {
    const raw = {
      stages: [
        { id: 's1', name: 'Lead', color: '#3b82f6', dealCount: 2, totalValue: 1000 },
        { id: 's2', name: 'Won', color: '#22c55e', dealCount: 1, totalValue: 5000 },
      ],
      totalValue: 6000,
    }
    const result = await loadPipelineDonut(mockDb(raw), 'acct-1')
    expect(result.stages).toHaveLength(2)
    expect(result.totalValue).toBe(6000)
    expect(result.stages[1].name).toBe('Won')
  })
})

describe('loadResponseTime', () => {
  it('returns null averages when no data', async () => {
    const raw = { buckets: [], thisWeekAvg: null, lastWeekAvg: null }
    const result = await loadResponseTime(mockDb(raw), 'acct-1')
    expect(result.buckets).toEqual([])
    expect(result.thisWeekAvg).toBeNull()
    expect(result.lastWeekAvg).toBeNull()
  })

  it('parses buckets and averages', async () => {
    const raw = {
      buckets: [
        { dow: 0, avgMinutes: 2.5, samples: 10 },
        { dow: 1, avgMinutes: 3.0, samples: 8 },
      ],
      thisWeekAvg: 2.8,
      lastWeekAvg: 4.1,
    }
    const result = await loadResponseTime(mockDb(raw), 'acct-1')
    expect(result.buckets).toHaveLength(2)
    expect(result.thisWeekAvg).toBe(2.8)
    expect(result.lastWeekAvg).toBe(4.1)
  })
})

describe('loadActivity', () => {
  it('returns an empty array for null data', async () => {
    const result = await loadActivity(mockDb(null), 'acct-1')
    expect(result).toEqual([])
  })

  it('parses activity items', async () => {
    const raw = [
      { id: 'msg-1', kind: 'message', text: 'New message from John', at: '2026-05-18T10:00:00Z', href: '/inbox?c=1' },
      { id: 'contact-1', kind: 'contact', text: 'New contact: Jane', at: '2026-05-18T09:00:00Z', href: '/contacts' },
    ]
    const result = await loadActivity(mockDb(raw), 'acct-1')
    expect(result).toHaveLength(2)
    expect(result[0].kind).toBe('message')
    expect(result[1].kind).toBe('contact')
  })
})
