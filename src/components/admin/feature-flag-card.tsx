'use client'

import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

interface FeatureFlag {
  id: string
  key: string
  label: string
  description: string | null
  enabled: boolean
  account_id: string | null
  account: { name: string } | null
}

interface FeatureFlagCardProps {
  flag: FeatureFlag
}

export function FeatureFlagCard({ flag }: FeatureFlagCardProps) {
  const router = useRouter()

  const toggle = async () => {
    const res = await fetch(`/api/admin/features/${flag.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !flag.enabled }),
    })
    if (res.ok) router.refresh()
  }

  return (
    <div className="flex items-center justify-between rounded-xl border bg-card p-4">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{flag.label}</p>
          {flag.account_id ? (
            <Badge variant="outline" className="text-[10px]">
              Per-account: {flag.account?.name ?? 'Unknown'}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">
              Global
            </Badge>
          )}
        </div>
        {flag.description && (
          <p className="text-xs text-muted-foreground">{flag.description}</p>
        )}
        <p className="font-mono text-[10px] text-muted-foreground">{flag.key}</p>
      </div>
      <Switch checked={flag.enabled} onCheckedChange={toggle} />
    </div>
  )
}
