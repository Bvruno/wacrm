'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { formatCurrency } from '@/lib/currency'
import {
  MessageSquare,
  UserPlus,
  DollarSign,
  Send,
  RefreshCw,
  AlertTriangle,
  Wifi,
  Database,
  Brain,
} from 'lucide-react'

import {
  loadActivity,
  loadConversationsSeries,
  loadMetrics,
  loadPipelineDonut,
  loadResponseTime,
} from '@/lib/dashboard/queries'
import type {
  ActivityItem,
  ConversationsSeriesPoint,
  DashboardError,
  MetricsBundle,
  PipelineDonutData,
  ResponseTimeSummary,
} from '@/lib/dashboard/types'

import { MetricCard } from '@/components/dashboard/metric-card'
import { SkeletonCard } from '@/components/dashboard/skeleton'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { ConversationsChart } from '@/components/dashboard/conversations-chart'
import { PipelineDonut } from '@/components/dashboard/pipeline-donut'
import { ResponseTimeChart } from '@/components/dashboard/response-time-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { SystemHealth } from '@/components/dashboard/system-health'
import type { HealthItem } from '@/components/dashboard/system-health'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

type RangeDays = 7 | 30 | 90

interface SectionState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

const INIT_SECTION = <T,>(): SectionState<T> => ({
  data: null,
  loading: true,
  error: null,
})

export default function DashboardPage() {
  const t = useTranslations('Dashboard.page')
  const ht = useTranslations('Dashboard.systemHealth')
  const { defaultCurrency, accountId } = useAuth()
  const db = useRef(createClient())

  const [metrics, setMetrics] = useState<SectionState<MetricsBundle>>(INIT_SECTION)
  const [range, setRange] = useState<RangeDays>(30)
  const [series, setSeries] = useState<
    Record<RangeDays, SectionState<ConversationsSeriesPoint[]>>
  >({
    7: INIT_SECTION(),
    30: INIT_SECTION(),
    90: INIT_SECTION(),
  })
  const [pipeline, setPipeline] = useState<SectionState<PipelineDonutData>>(INIT_SECTION)
  const [responseTime, setResponseTime] = useState<SectionState<ResponseTimeSummary>>(INIT_SECTION)
  const [activity, setActivity] = useState<SectionState<ActivityItem[]>>(INIT_SECTION)

  const [errors, setErrors] = useState<DashboardError[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const [healthItems, setHealthItems] = useState<HealthItem[]>([
    { key: 'whatsapp', label: ht('whatsapp'), icon: Wifi, status: 'disconnected', message: ht('checking') },
    { key: 'storage', label: ht('storage'), icon: Database, status: 'ok', message: ht('checking') },
    { key: 'ai', label: ht('ai'), icon: Brain, status: 'disabled', message: ht('checking') },
  ])
  const [healthLoading, setHealthLoading] = useState(true)

  const loadSection = useCallback(
    async <T,>(
      loader: () => Promise<T>,
      setter: (state: SectionState<T>) => void,
      sectionName: string,
    ) => {
      setter({ data: null, loading: true, error: null })
      try {
        const data = await loader()
        setter({ data, loading: false, error: null })
        setErrors((prev) => prev.filter((e) => e.section !== sectionName))
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred'
        setter({ data: null, loading: false, error: message })
        setErrors((prev) => {
          const filtered = prev.filter((e) => e.section !== sectionName)
          return [...filtered, { section: sectionName, message }]
        })
      }
    },
    [],
  )

  const loadAll = useCallback(() => {
    if (!accountId) return
    const client = db.current

    loadSection(
      () => loadMetrics(client, accountId),
      setMetrics,
      'metrics',
    )
    loadSection(
      () => loadConversationsSeries(client, accountId, 30),
      (s) => setSeries((prev) => ({ ...prev, 30: s })),
      'series-30',
    )
    loadSection(
      () => loadPipelineDonut(client, accountId),
      setPipeline,
      'pipeline',
    )
    loadSection(
      () => loadResponseTime(client, accountId),
      setResponseTime,
      'responseTime',
    )
    loadSection(
      () => loadActivity(client, accountId, 50),
      setActivity,
      'activity',
    )
    setLastUpdated(new Date())
  }, [accountId, loadSection])

  const loadHealth = useCallback(async () => {
    if (!accountId) return
    setHealthLoading(true)
    try {
      const client = db.current
      const { data: wc } = await client
        .from('whatsapp_config')
        .select('status')
        .eq('account_id', accountId)
        .maybeSingle()

      const ws = wc?.status === 'connected' ? 'ok' : 'disconnected'

      setHealthItems([
        { key: 'whatsapp', label: ht('whatsapp'), icon: Wifi, status: ws, message: ws === 'ok' ? ht('whatsappConnected') : ht('whatsappDisconnected') },
        { key: 'storage', label: ht('storage'), icon: Database, status: 'ok', message: ht('storageOk') },
        { key: 'ai', label: ht('ai'), icon: Brain, status: 'disabled', message: ht('aiDisabled') },
      ])
    } catch {
      // Health check failure is non-critical
    } finally {
      setHealthLoading(false)
    }
  }, [accountId, ht])

  useEffect(() => {
    if (!accountId) return
    loadAll()
    loadHealth()
  }, [accountId, loadAll, loadHealth])

  const handleManualRefresh = useCallback(() => {
    setRefreshing(true)
    loadAll()
    loadHealth()
    setTimeout(() => setRefreshing(false), 500)
  }, [loadAll, loadHealth])

  const handleRangeChange = useCallback(
    (r: RangeDays) => {
      setRange(r)
      const existing = series[r]
      if (existing && !existing.loading && existing.data !== null) return
      if (!accountId) return
      loadSection(
        () => loadConversationsSeries(db.current, accountId, r),
        (s) => setSeries((prev) => ({ ...prev, [r]: s })),
        `series-${r}`,
      )
    },
    [accountId, series, loadSection],
  )

  return (
    <div className="space-y-5">
      {/* Header with refresh */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('description')}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          {lastUpdated && (
            <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
              {t('lastUpdated', { time: lastUpdated.toLocaleTimeString() })}
            </span>
          )}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')}
            />
            {t('refresh')}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {errors.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            {t('errors', { count: errors.length })}{' '}
            <button
              type="button"
              onClick={handleManualRefresh}
              className="font-medium underline underline-offset-2 hover:text-red-300"
            >
              {t('retry')}
            </button>
          </span>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : metrics.error ? (
          <>
            <MetricCard
              title={t('activeConversations')}
              value="—"
              icon={MessageSquare}
              delta={{ sign: 0, label: t('errorState') }}
            />
            <MetricCard
              title={t('newContactsToday')}
              value="—"
              icon={UserPlus}
              delta={{ sign: 0, label: t('errorState') }}
            />
            <MetricCard
              title={t('openDealsValue')}
              value="—"
              icon={DollarSign}
              subtitle={t('errorState')}
            />
            <MetricCard
              title={t('messagesSentToday')}
              value="—"
              icon={Send}
              delta={{ sign: 0, label: t('errorState') }}
            />
          </>
        ) : metrics.data ? (
          <>
            <MetricCard
              title={t('activeConversations')}
              value={metrics.data.activeConversations.current.toLocaleString()}
              icon={MessageSquare}
              delta={{
                sign: metrics.data.activeConversations.previous,
                label: deltaLabel(
                  metrics.data.activeConversations.previous,
                  t('newTodayVsYesterday'),
                  t('noChange', { suffix: t('newTodayVsYesterday') }),
                ),
              }}
            />
            <MetricCard
              title={t('newContactsToday')}
              value={metrics.data.newContactsToday.current.toLocaleString()}
              icon={UserPlus}
              delta={{
                sign:
                  metrics.data.newContactsToday.current -
                  metrics.data.newContactsToday.previous,
                label: deltaLabel(
                  metrics.data.newContactsToday.current -
                    metrics.data.newContactsToday.previous,
                  t('vsYesterday'),
                  t('noChange', { suffix: t('vsYesterday') }),
                ),
              }}
            />
            <MetricCard
              title={t('openDealsValue')}
              value={formatCurrency(
                metrics.data.openDealsValue,
                defaultCurrency,
              )}
              icon={DollarSign}
              subtitle={t('openDeals', {
                count: metrics.data.openDealsCount,
              })}
            />
            <MetricCard
              title={t('messagesSentToday')}
              value={metrics.data.messagesSentToday.current.toLocaleString()}
              icon={Send}
              delta={{
                sign:
                  metrics.data.messagesSentToday.current -
                  metrics.data.messagesSentToday.previous,
                label: deltaLabel(
                  metrics.data.messagesSentToday.current -
                    metrics.data.messagesSentToday.previous,
                  t('vsYesterday'),
                  t('noChange', { suffix: t('vsYesterday') }),
                ),
              }}
            />
          </>
        ) : null}
      </div>

      {/* Quick actions */}
      <QuickActions />

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="h-full lg:col-span-3">
          <ConversationsChart
            series={
              Object.fromEntries(
                Object.entries(series).map(([k, v]) => [k, v.loading ? null : v.data]),
              ) as Record<RangeDays, ConversationsSeriesPoint[] | null>
            }
            loading={series[range]?.loading ?? true}
            range={range}
            onRangeChange={handleRangeChange}
          />
        </div>
        <div className="h-full lg:col-span-2">
          <PipelineDonut
            data={pipeline.loading ? null : pipeline.data}
            loading={pipeline.loading}
            currency={defaultCurrency}
          />
        </div>
      </div>

      {/* Response time */}
      <ResponseTimeChart
        data={responseTime.loading ? null : responseTime.data}
        loading={responseTime.loading}
      />

      {/* Activity feed */}
      <ActivityFeed
        items={activity.loading ? null : activity.data}
        loading={activity.loading}
      />

      {/* System health */}
      <SystemHealth
        items={healthItems}
        lastChecked={lastUpdated}
        onRefresh={handleManualRefresh}
        loading={healthLoading}
      />
    </div>
  )
}

function deltaLabel(
  delta: number,
  suffix: string,
  noChangeLabel: string,
): string {
  if (delta === 0) return noChangeLabel
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toLocaleString()} ${suffix}`
}
