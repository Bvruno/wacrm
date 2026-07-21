'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePlan } from '@/hooks/use-plan'

export function BillingTab() {
  const { data, loading } = usePlan()

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>
  if (!data) return <p className="text-sm text-muted-foreground">Failed to load plan data</p>

  const agentPercent = data.limits.maxAgents === -1
    ? 0
    : Math.min((data.usage.agents / data.limits.maxAgents) * 100, 100)
  const messagePercent = data.limits.maxMessagesPerDay === -1
    ? 0
    : Math.min((data.usage.messagesToday / data.limits.maxMessagesPerDay) * 100, 100)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                {data.plan?.name ?? 'Free'} plan
                {data.trialEndsAt && ` · Trial ends ${new Date(data.trialEndsAt).toLocaleDateString()}`}
              </CardDescription>
            </div>
            <Badge>{data.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.plan && (
            <div className="text-sm text-muted-foreground">
              {data.plan.currency.toUpperCase()} {(data.plan.price / 100).toFixed(2)} / month
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Agents</span>
              <span>
                {data.usage.agents}
                {data.limits.maxAgents !== -1 ? ` / ${data.limits.maxAgents}` : ''}
              </span>
            </div>
            {data.limits.maxAgents !== -1 && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${agentPercent}%` }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Messages today</span>
              <span>
                {data.usage.messagesToday}
                {data.limits.maxMessagesPerDay !== -1 ? ` / ${data.limits.maxMessagesPerDay}` : ''}
              </span>
            </div>
            {data.limits.maxMessagesPerDay !== -1 && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${messagePercent}%` }}
                />
              </div>
            )}
          </div>

          <div className="space-y-1 pt-2">
            <p className="text-sm font-medium">Features</p>
            <FeatureCheck enabled={data.limits.has_broadcasts} label="Broadcasts" />
            <FeatureCheck enabled={data.limits.has_automations} label="Automations" />
            <FeatureCheck enabled={data.limits.has_ai_assistant} label="AI Assistant" />
          </div>

          <Button variant="outline" className="mt-2">
            <a href="mailto:support@wacrm.com?subject=Plan%20Upgrade%20Request">
              Upgrade Plan
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function FeatureCheck({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={enabled ? 'text-emerald-600' : 'text-muted-foreground'}>
        {enabled ? '✓' : '✗'}
      </span>
      <span className={enabled ? '' : 'text-muted-foreground'}>{label}</span>
    </div>
  )
}
