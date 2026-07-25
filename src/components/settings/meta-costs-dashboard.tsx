'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DollarSign,
  MessageSquare,
  Bot,
  Loader2,
  TrendingUp,
  Radio,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';

interface DailyBucket {
  date: string;
  inbound: number;
  outboundFree: number;
  outboundTemplate: number;
  outboundBroadcast: number;
  costMeta: number;
  costAi: number;
  costTotal: number;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  cost: number;
}

interface AiCost {
  totalTokens: number;
  totalCalls: number;
  autoReplyTokens: number;
  draftTokens: number;
  estimatedCostUsd: number;
}

interface CostData {
  summary: {
    period: string;
    totalMessages: {
      inbound: number;
      outboundFree: number;
      outboundTemplate: number;
      outboundBroadcast: number;
      totalOutbound: number;
    };
    costs: {
      metaUsd: number;
      aiUsd: number;
      totalUsd: number;
    };
    rates: Record<string, number>;
    freeServiceConversations: number;
    templateConversations: number;
  };
  daily: DailyBucket[];
  categoryBreakdown: CategoryBreakdown[];
  aiCost: AiCost;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  marketing: {
    label: 'Marketing',
    color:
      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
  utility: {
    label: 'Utility',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  authentication: {
    label: 'Authentication',
    color:
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  },
  service: {
    label: 'Service (free)',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
};

export function MetaCostsDashboard() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const t = useTranslations('Costs');

  const fetchCosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/costs?days=${days}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void fetchCosts();
  }, [fetchCosts]);

  const formatCurrency = (usd: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(usd);
  };

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-16">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading costs...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        No cost data available.
      </div>
    );
  }

  const maxDailyCost = Math.max(...data.daily.map((d) => d.costTotal), 0.01);
  const maxDailyMsg = Math.max(
    ...data.daily.map(
      (d) =>
        d.inbound + d.outboundFree + d.outboundTemplate + d.outboundBroadcast
    ),
    1
  );

  const projectedMonthly =
    data.daily.length > 0
      ? (data.summary.costs.totalUsd / data.daily.length) * 30
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {t('title') || 'WhatsApp & AI Costs'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t('description') ||
              'Estimated costs for Meta WhatsApp messaging and AI usage.'}
          </p>
        </div>
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

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.summary.costs.totalUsd)}
            </div>
            <p className="text-muted-foreground text-xs">
              ~{formatCurrency(projectedMonthly)} projected/month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Meta Cost</CardTitle>
            <Radio className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.summary.costs.metaUsd)}
            </div>
            <p className="text-muted-foreground text-xs">
              {data.summary.templateConversations} template conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AI Cost (LLM)</CardTitle>
            <Sparkles className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.summary.costs.aiUsd)}
            </div>
            <p className="text-muted-foreground text-xs">
              {data.aiCost.totalCalls} calls,{' '}
              {(data.aiCost.totalTokens / 1000).toFixed(1)}K tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Free Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.summary.totalMessages.outboundFree +
                data.summary.totalMessages.inbound}
            </div>
            <p className="text-muted-foreground text-xs">
              {data.summary.totalMessages.inbound} inbound +{' '}
              {data.summary.totalMessages.outboundFree} within 24h window
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Cost Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Cost</CardTitle>
        </CardHeader>
        <CardContent>
          {data.daily.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No data in this period.
            </p>
          ) : (
            <div className="flex h-40 items-end gap-1">
              {data.daily.map((day) => (
                <div
                  key={day.date}
                  className="group relative flex flex-1 flex-col items-center gap-0.5"
                  title={`${day.date}: Meta ${formatCurrency(day.costMeta)} + AI ${formatCurrency(day.costAi)}`}
                >
                  <div className="flex w-full flex-col gap-0">
                    {/* AI cost (blue) */}
                    {day.costAi > 0 && (
                      <div
                        className="w-full rounded-t bg-blue-400/80 transition-colors hover:bg-blue-500"
                        style={{
                          height: `${Math.max((day.costAi / maxDailyCost) * 100, 1)}%`,
                        }}
                      />
                    )}
                    {/* Meta cost (orange) */}
                    {day.costMeta > 0 && (
                      <div
                        className="w-full bg-orange-400/80 transition-colors hover:bg-orange-500"
                        style={{
                          height: `${Math.max((day.costMeta / maxDailyCost) * 100, 1)}%`,
                        }}
                      />
                    )}
                    {/* No cost bar */}
                    {day.costTotal === 0 && (
                      <div
                        className="bg-muted/30 w-full rounded-t"
                        style={{ height: '2px' }}
                      />
                    )}
                  </div>
                  <span className="text-muted-foreground mt-1 text-[8px]">
                    {new Date(day.date).getDate()}
                  </span>
                  {/* Tooltip */}
                  <div className="bg-popover ring-border absolute bottom-full z-50 mb-2 hidden rounded px-2 py-1 text-[10px] whitespace-nowrap shadow-md ring-1 group-hover:block">
                    <p className="font-medium">{day.date}</p>
                    <p>Meta: {formatCurrency(day.costMeta)}</p>
                    <p>AI: {formatCurrency(day.costAi)}</p>
                    <p>
                      Msgs:{' '}
                      {day.inbound +
                        day.outboundFree +
                        day.outboundTemplate +
                        day.outboundBroadcast}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="text-muted-foreground mt-3 flex items-center justify-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-orange-400" /> Meta
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-blue-400" /> AI (LLM)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Daily Messages Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {data.daily.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No data in this period.
            </p>
          ) : (
            <div className="flex h-32 items-end gap-1">
              {data.daily.map((day) => {
                const total =
                  day.inbound +
                  day.outboundFree +
                  day.outboundTemplate +
                  day.outboundBroadcast;
                return (
                  <div
                    key={day.date}
                    className="group relative flex flex-1 flex-col items-center"
                    title={`${day.date}: ${total} messages`}
                  >
                    <div className="flex w-full flex-col gap-0">
                      {/* Broadcast (purple) */}
                      {day.outboundBroadcast > 0 && (
                        <div
                          className="w-full bg-purple-400/80"
                          style={{
                            height: `${Math.max((day.outboundBroadcast / maxDailyMsg) * 100, 2)}%`,
                          }}
                        />
                      )}
                      {/* Template (orange) */}
                      {day.outboundTemplate > 0 && (
                        <div
                          className="w-full bg-orange-400/80"
                          style={{
                            height: `${Math.max((day.outboundTemplate / maxDailyMsg) * 100, 2)}%`,
                          }}
                        />
                      )}
                      {/* Free-form (green) */}
                      {day.outboundFree > 0 && (
                        <div
                          className="w-full bg-green-400/80"
                          style={{
                            height: `${Math.max((day.outboundFree / maxDailyMsg) * 100, 2)}%`,
                          }}
                        />
                      )}
                      {/* Inbound (blue) */}
                      {day.inbound > 0 && (
                        <div
                          className="w-full rounded-t bg-blue-400/80"
                          style={{
                            height: `${Math.max((day.inbound / maxDailyMsg) * 100, 2)}%`,
                          }}
                        />
                      )}
                    </div>
                    <span className="text-muted-foreground mt-1 text-[8px]">
                      {new Date(day.date).getDate()}
                    </span>
                    <div className="bg-popover ring-border absolute bottom-full z-50 mb-2 hidden rounded px-2 py-1 text-[10px] whitespace-nowrap shadow-md ring-1 group-hover:block">
                      <p className="font-medium">{day.date}</p>
                      <p>Inbound: {day.inbound}</p>
                      <p>Free (in 24h): {day.outboundFree}</p>
                      <p>Templates: {day.outboundTemplate}</p>
                      <p>Broadcasts: {day.outboundBroadcast}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="text-muted-foreground mt-3 flex flex-wrap items-center justify-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-blue-400" /> Inbound
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-green-400" /> Free (in
              24h)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-orange-400" /> Templates
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-purple-400" /> Broadcasts
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Template Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Template Costs by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.categoryBreakdown.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No template messages in this period.
            </p>
          ) : (
            <div className="space-y-2">
              {data.categoryBreakdown.map((cat) => {
                const config = CATEGORY_LABELS[cat.category] || {
                  label: cat.category,
                  color: 'bg-gray-100 text-gray-800',
                };
                const rate = data.summary.rates[cat.category] || 0;
                return (
                  <div
                    key={cat.category}
                    className="border-border flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className={config.color}>{config.label}</Badge>
                      <span className="text-muted-foreground text-sm">
                        {cat.count} conversations
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground text-xs">
                        @ {formatCurrency(rate)}/conv
                      </span>
                      <span className="font-medium">
                        {formatCurrency(cat.cost)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" /> AI (LLM) Cost Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.aiCost.totalCalls === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No AI usage in this period.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border-border rounded-md border p-3">
                  <p className="text-sm font-medium">Auto-reply</p>
                  <p className="text-muted-foreground text-xs">
                    {(data.aiCost.autoReplyTokens / 1000).toFixed(1)}K tokens
                  </p>
                </div>
                <div className="border-border rounded-md border p-3">
                  <p className="text-sm font-medium">Draft with AI</p>
                  <p className="text-muted-foreground text-xs">
                    {(data.aiCost.draftTokens / 1000).toFixed(1)}K tokens
                  </p>
                </div>
              </div>
              <div className="border-border flex items-center justify-between rounded-md border p-3">
                <span className="text-muted-foreground text-sm">
                  Estimated cost (~$0.30/1M tokens, gpt-4o-mini blended)
                </span>
                <span className="font-medium">
                  {formatCurrency(data.aiCost.estimatedCostUsd)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rate Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" /> Current Rate Card
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(data.summary.rates).map(([category, rate]) => {
              const config = CATEGORY_LABELS[category] || {
                label: category,
                color: 'bg-gray-100 text-gray-800',
              };
              return (
                <div
                  key={category}
                  className="border-border flex items-center justify-between rounded-md border p-3"
                >
                  <Badge className={config.color}>{config.label}</Badge>
                  <span className="text-sm font-medium">
                    {formatCurrency(rate)}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            Rates are per conversation (24h window). Service conversations
            (customer-initiated) are free within the window. Configure rates in
            meta_costs table for your specific country.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
