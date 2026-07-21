'use client'

import { RefreshCw } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

export interface HealthItem {
  key: string
  label: string
  icon: ComponentType<{ className?: string }>
  status: 'ok' | 'error' | 'disconnected' | 'disabled'
  message?: string
}

interface SystemHealthProps {
  items: HealthItem[]
  lastChecked: Date | null
  onRefresh: () => void
  loading: boolean
}

function StatusDot({ status }: { status: HealthItem['status'] }) {
  const dotClass =
    status === 'ok'
      ? 'bg-emerald-500'
      : status === 'disconnected'
        ? 'bg-amber-500'
        : status === 'disabled'
          ? 'bg-muted-foreground/40'
          : 'bg-red-500'
  return (
    <span
      className={cn('inline-block h-2 w-2 rounded-full', dotClass)}
      aria-hidden
    />
  )
}

export function SystemHealth({ items, lastChecked, onRefresh, loading }: SystemHealthProps) {
  const t = useTranslations('Dashboard.systemHealth')

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t('title')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex items-center gap-2">
          {lastChecked && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {t('lastChecked', { time: lastChecked.toLocaleTimeString() })}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            {t('refresh')}
          </button>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.key} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <StatusDot status={item.status} />
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                </div>
                {item.message && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.message}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
