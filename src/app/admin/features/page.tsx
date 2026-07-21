'use client'

import { useEffect, useState } from 'react'
import { FeatureFlagCard } from '@/components/admin/feature-flag-card'

interface FeatureFlag {
  id: string
  key: string
  label: string
  description: string | null
  enabled: boolean
  account_id: string | null
  account: { name: string } | null
}

export default function AdminFeaturesPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])

  useEffect(() => {
    fetch('/api/admin/features')
      .then((res) => res.json())
      .then(setFlags)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feature Flags</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Toggle features globally or per account
        </p>
      </div>

      <div className="space-y-3">
        {flags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No feature flags configured</p>
        ) : (
          flags.map((flag) => <FeatureFlagCard key={flag.id} flag={flag} />)
        )}
      </div>
    </div>
  )
}
