'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X, Download, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function PwaInstallPrompt() {
  const t = useTranslations('pwa');
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const deferredPrompt = useRef<Event | null>(null);
  const [installReady, setInstallReady] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const swRef = useRef<ServiceWorkerRegistration | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })
        .then((reg) => {
          swRef.current = reg;
          if (reg.waiting) {
            setUpdateReady(true);
          }
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                setUpdateReady(true);
              }
            });
          });
        })
        .catch((err) => {
          console.error('[pwa] ServiceWorker registration failed:', err);
        });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setInstallReady(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleUpdate = useCallback(() => {
    const waiting = swRef.current?.waiting;
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, []);

  if (!mounted || dismissed) return null;

  if (updateReady) {
    return (
      <div className="border-border bg-card fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border p-4 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-sm font-semibold">
              {t('updateAvailable')}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {t('updateReady')}
            </p>
            <Button
              size="sm"
              onClick={handleUpdate}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-3"
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              {t('refresh')}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setUpdateReady(false)}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
            aria-label={t('dismiss')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (typeof navigator !== 'undefined' &&
      'standalone' in navigator &&
      (navigator as Record<string, unknown>).standalone === true);
  if (isStandalone) return null;

  async function handleInstall() {
    const prompt = deferredPrompt.current as
      | {
          prompt: () => Promise<void>;
          userChoice: Promise<{ outcome: string }>;
        }
      | null
      | undefined;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt.current = null;
      setInstallReady(false);
      setDismissed(true);
    }
  }

  return (
    <div className="border-border bg-card fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-sm font-semibold">{t('title')}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {isIOS ? t('iosHint') : t('installHint')}
          </p>
          {!isIOS && installReady && (
            <Button
              size="sm"
              onClick={handleInstall}
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-3"
            >
              <Download className="mr-1.5 h-4 w-4" />
              {t('install')}
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
          aria-label={t('dismiss')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
