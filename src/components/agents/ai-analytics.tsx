'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  BarChart3,
  MessageSquare,
  ArrowUpRight,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Bot,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslations } from 'next-intl'

interface AnalyticsData {
  summary: {
    totalTokens: number
    totalCalls: number
    totalHandoffs: number
    avgResponseTime: number
    autoReplyTokens: number
    draftTokens: number
    handoffRate: number
  }
  agentStats: {
    agent_id: string
    agent_name: string
    calls: number
    tokens: number
    handoffs: number
  }[]
  feedbackStats: {
    total: number
    positive: number
    negative: number
    neutral: number
  }
  dailyUsage: { date: string; calls: number; tokens: number }[]
  feedback: { id: string; rating: number; comment?: string; created_at: string }[]
}

export function AiAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const t = useTranslations('Agents')

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ai/analytics?days=${days}`)
      const json = await res.json()
      if (res.ok) {
        setData(json)
      } else {
        toast.error(json.error || 'Failed to load analytics')
      }
    } catch {
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    void fetchAnalytics()
  }, [fetchAnalytics])

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t('loading')}
      </div>
    )
  }

  if (!data) return null

  const maxDailyTokens = Math.max(...data.dailyUsage.map((d) => d.tokens), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('analytics')}</h2>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data.summary.totalTokens)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(data.summary.autoReplyTokens)} auto-reply,{' '}
              {formatNumber(data.summary.draftTokens)} drafts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              Avg response: {data.summary.avgResponseTime}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Handoffs</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.totalHandoffs}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.summary.handoffRate}% handoff rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Feedback</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.feedbackStats.total}</div>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-green-600">
                <ThumbsUp className="h-3 w-3" /> {data.feedbackStats.positive}
              </span>
              <span className="flex items-center gap-1 text-yellow-600">
                <Minus className="h-3 w-3" /> {data.feedbackStats.neutral}
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <ThumbsDown className="h-3 w-3" /> {data.feedbackStats.negative}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Usage</CardTitle>
        </CardHeader>
        <CardContent>
          {data.dailyUsage.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No usage data in this period.
            </p>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {data.dailyUsage.map((day) => (
                <div
                  key={day.date}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${day.date}: ${day.calls} calls, ${formatNumber(day.tokens)} tokens`}
                >
                  <div
                    className="w-full rounded-t bg-primary/80 transition-colors hover:bg-primary"
                    style={{
                      height: `${Math.max((day.tokens / maxDailyTokens) * 100, 2)}%`,
                    }}
                  />
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(day.date).getDate()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Agent</CardTitle>
        </CardHeader>
        <CardContent>
          {data.agentStats.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No agent data yet.
            </p>
          ) : (
            <div className="space-y-2">
              {data.agentStats.map((agent) => (
                <div
                  key={agent.agent_id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{agent.agent_name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      {agent.calls} calls
                    </span>
                    <span className="text-muted-foreground">
                      {formatNumber(agent.tokens)} tokens
                    </span>
                    {agent.handoffs > 0 && (
                      <Badge variant="outline">
                        {agent.handoffs} handoffs
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {data.feedback.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.feedback.slice(0, 10).map((fb) => (
                <div
                  key={fb.id}
                  className="flex items-start gap-3 rounded-md border border-border p-3"
                >
                  <div className="mt-0.5">
                    {fb.rating >= 4 ? (
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                    ) : fb.rating <= 2 ? (
                      <ThumbsDown className="h-4 w-4 text-red-600" />
                    ) : (
                      <Minus className="h-4 w-4 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {fb.comment && (
                      <p className="text-sm text-foreground">{fb.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(fb.created_at).toLocaleDateString()} · Rating:{' '}
                      {fb.rating}/5
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
