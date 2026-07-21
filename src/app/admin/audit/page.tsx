'use client'

import { useEffect, useState } from 'react'
import { AuditTable } from '@/components/admin/audit-table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface AuditEntry {
  id: string
  actor_user_id: string
  action: string
  target_type: string
  target_id: string | null
  details: Record<string, unknown>
  created_at: string
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [targetType, setTargetType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), per_page: '50' })
    if (action) params.set('action', action)
    if (targetType) params.set('target_type', targetType)
    if (from) params.set('from', from)
    if (to) params.set('to', to)

    fetch(`/api/admin/audit?${params}`)
      .then((res) => res.json())
      .then((d) => {
        setEntries(d.data ?? [])
        setTotal(d.total ?? 0)
      })
  }, [page, action, targetType, from, to])

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track all admin actions
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Filter by action..."
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="w-48"
        />
        <Input
          placeholder="Target type..."
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
          className="w-48"
        />
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-40"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-40"
        />
        <Button variant="secondary" onClick={() => { setPage(1); }}>
          Filter
        </Button>
      </div>

      <div className="rounded-xl border">
        <AuditTable data={entries} />
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm ${
                p === page
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
