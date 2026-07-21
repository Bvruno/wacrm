import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ActivityItem,
  ConversationsSeriesPoint,
  MetricsBundle,
  PipelineDonutData,
  ResponseTimeSummary,
} from './types'

type DB = SupabaseClient

function toMetricDelta(v: unknown): { current: number; previous: number } {
  const o = (v ?? {}) as Record<string, unknown>
  return { current: Number(o.current) || 0, previous: Number(o.previous) || 0 }
}

function parseMetrics(raw: unknown): MetricsBundle {
  if (!raw) {
    return {
      activeConversations: { current: 0, previous: 0 },
      newContactsToday: { current: 0, previous: 0 },
      openDealsValue: 0,
      openDealsCount: 0,
      messagesSentToday: { current: 0, previous: 0 },
    }
  }
  const r = raw as Record<string, unknown>
  return {
    activeConversations: toMetricDelta(r.activeConversations),
    newContactsToday: toMetricDelta(r.newContactsToday),
    openDealsValue: Number(r.openDealsValue) || 0,
    openDealsCount: Number(r.openDealsCount) || 0,
    messagesSentToday: toMetricDelta(r.messagesSentToday),
  }
}

function parseSeries(raw: unknown): ConversationsSeriesPoint[] {
  if (!Array.isArray(raw)) return []
  return raw as ConversationsSeriesPoint[]
}

function parsePipeline(raw: unknown): PipelineDonutData {
  if (!raw) return { stages: [], totalValue: 0 }
  const r = raw as Record<string, unknown>
  return {
    stages: Array.isArray(r.stages) ? (r.stages as PipelineDonutData['stages']) : [],
    totalValue: Number(r.totalValue) || 0,
  }
}

function parseResponseTime(raw: unknown): ResponseTimeSummary {
  const r = raw as Record<string, unknown>
  return {
    buckets: Array.isArray(r.buckets) ? (r.buckets as ResponseTimeSummary['buckets']) : [],
    thisWeekAvg: r.thisWeekAvg != null ? Number(r.thisWeekAvg) : null,
    lastWeekAvg: r.lastWeekAvg != null ? Number(r.lastWeekAvg) : null,
  }
}

function parseActivity(raw: unknown): ActivityItem[] {
  if (!Array.isArray(raw)) return []
  return raw as ActivityItem[]
}

export async function loadMetrics(
  db: DB,
  accountId: string,
): Promise<MetricsBundle> {
  const { data, error } = await db.rpc('get_dashboard_metrics', {
    p_account_id: accountId,
  })
  if (error) throw error
  return parseMetrics(data)
}

export async function loadConversationsSeries(
  db: DB,
  accountId: string,
  rangeDays: number,
): Promise<ConversationsSeriesPoint[]> {
  const { data, error } = await db.rpc('get_conversations_series', {
    p_account_id: accountId,
    p_range_days: rangeDays,
  })
  if (error) throw error
  return parseSeries(data)
}

export async function loadPipelineDonut(
  db: DB,
  accountId: string,
): Promise<PipelineDonutData> {
  const { data, error } = await db.rpc('get_pipeline_donut', {
    p_account_id: accountId,
  })
  if (error) throw error
  return parsePipeline(data)
}

export async function loadResponseTime(
  db: DB,
  accountId: string,
): Promise<ResponseTimeSummary> {
  const { data, error } = await db.rpc('get_response_time_summary', {
    p_account_id: accountId,
  })
  if (error) throw error
  return parseResponseTime(data)
}

export async function loadActivity(
  db: DB,
  accountId: string,
  limit = 20,
): Promise<ActivityItem[]> {
  const { data, error } = await db.rpc('get_activity_feed', {
    p_account_id: accountId,
    p_limit: limit,
  })
  if (error) throw error
  return parseActivity(data)
}
