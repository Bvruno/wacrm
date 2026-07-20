'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'

export function PwaInstallPrompt() {
  const t = useTranslations('pwa')
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      }).catch(() => {
        // SW registration failed — not critical
      })
    }
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!mounted || dismissed) return null

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
  const isStandalone = window.matchMedia(
    '(display-mode: standalone)',
  ).matches
  if (isStandalone) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-border bg-card p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{t('title')}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isIOS ? t('iosHint') : t('installHint')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t('dismiss')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
