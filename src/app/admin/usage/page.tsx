'use client'

import { useEffect, useState } from 'react'
import { UsageChart } from '@/components/admin/usage-chart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function AdminUsagePage() {
  const [metric, setMetric] = useState('messages')
  const [period, setPeriod] = useState('30d')
  const [data, setData] = useState<{ label: string; value: number }[]>([])

  useEffect(() => {
    fetch(`/api/admin/usage?period=${period}&metric=${metric}`)
      .then((res) => res.json())
      .then((d) => setData(d.data ?? []))
  }, [metric, period])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          System usage over time
        </p>
      </div>

      <div className="flex gap-4">
        <Select value={metric} onValueChange={(v) => setMetric(v ?? 'messages')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="messages">Messages</SelectItem>
          </SelectContent>
        </Select>

        <Select value={period} onValueChange={(v) => setPeriod(v ?? '30d')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <UsageChart
        title={`${metric} (${period})`}
        data={data}
        height={300}
      />
    </div>
  )
}
