'use client';

import { RefreshCw } from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export interface HealthItem {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  status: 'ok' | 'error' | 'disconnected' | 'disabled';
  message?: string;
}

interface SystemHealthProps {
  items: HealthItem[];
  lastChecked: Date | null;
  onRefresh: () => void;
  loading: boolean;
}

function StatusDot({ status }: { status: HealthItem['status'] }) {
  const dotClass =
    status === 'ok'
      ? 'bg-emerald-500'
      : status === 'disconnected'
        ? 'bg-amber-500'
        : status === 'disabled'
          ? 'bg-muted-foreground/40'
          : 'bg-red-500';
  return (
    <span
      className={cn('inline-block h-2 w-2 rounded-full', dotClass)}
      aria-hidden
    />
  );
}

export function SystemHealth({
  items,
  lastChecked,
  onRefresh,
  loading,
}: SystemHealthProps) {
  const t = useTranslations('Dashboard.systemHealth');

  return (
    <section className="border-border bg-card rounded-xl border">
      <header className="border-border flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="text-foreground text-sm font-semibold">
            {t('title')}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t('description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastChecked && (
            <span className="text-muted-foreground text-xs tabular-nums">
              {t('lastChecked', { time: lastChecked.toLocaleTimeString() })}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', loading && 'animate-spin')}
            />
            {t('refresh')}
          </button>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className="border-border/60 bg-muted/30 flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-lg">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <StatusDot status={item.status} />
                  <p className="text-foreground text-sm font-medium">
                    {item.label}
                  </p>
                </div>
                {item.message && (
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {item.message}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
