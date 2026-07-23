'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, BellOff, Loader2, AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import {
  subscribeUser,
  unsubscribeUser,
  getSubscriptionStatus,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/app/(dashboard)/settings/push-actions'
import type { NotificationPreferences } from '@/types'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return new Uint8Array(rawData.length).map((_, i) => rawData.charCodeAt(i))
}

const PREF_KEYS: (keyof NotificationPreferences)[] = [
  'new_message',
  'conversation_assigned',
  'broadcast_completed',
  'contact_imported',
  'automation_failed',
]

export function PushNotifications() {
  const t = useTranslations('Settings.push')
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null)
  const [savingPref, setSavingPref] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [endpointCount, setEndpointCount] = useState(0)
  const localEndpoint = useRef<string | null>(null)

  useEffect(() => {
    const supported =
      'serviceWorker' in navigator && 'PushManager' in window
    setSupported(supported)

    if (!supported) {
      setLoading(false)
      return
    }

    let cancelled = false
    async function init() {
      const status = await getSubscriptionStatus()
      if (cancelled) return
      setConfigured(status.configured)
      setEndpointCount(status.endpoints.length)

      let localSubEndpoint: string | null = null
      try {
        const registration = await navigator.serviceWorker.ready
        const sub = await registration.pushManager.getSubscription()
        if (sub) {
          const serialized = JSON.parse(JSON.stringify(sub)) as {
            endpoint: string
          }
          localSubEndpoint = serialized.endpoint
          localEndpoint.current = localSubEndpoint
        }
      } catch {
        // serviceWorker.ready may reject if SW failed to register
      }

      const hasLocalSub =
        !!localSubEndpoint &&
        status.endpoints.includes(localSubEndpoint)
      setSubscribed(hasLocalSub)

      setPermissionDenied(Notification.permission === 'denied')
      setLoading(false)
    }

    init()
    getNotificationPreferences().then((p) => {
      if (!cancelled) setPreferences(p)
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function toggleSubscription() {
    setToggling(true)
    try {
      if (subscribed) {
        await unsubscribeUser(
          localEndpoint.current ?? undefined,
        )
        setSubscribed(false)
        const status = await getSubscriptionStatus()
        setEndpointCount(status.endpoints.length)
      } else {
        const registration =
          await navigator.serviceWorker.ready
        const sub =
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
            ),
          })
        const serialized = JSON.parse(JSON.stringify(sub)) as {
          endpoint: string
          keys: { p256dh: string; auth: string }
        }
        localEndpoint.current = serialized.endpoint
        await subscribeUser(serialized)
        setSubscribed(true)
        setPermissionDenied(false)
        const status = await getSubscriptionStatus()
        setEndpointCount(status.endpoints.length)
        getNotificationPreferences().then(setPreferences)
      }
    } catch (err) {
      console.error('Failed to toggle subscription:', err)
    } finally {
      setToggling(false)
    }
  }

  const togglePref = useCallback(
    async (key: keyof NotificationPreferences) => {
      if (!preferences) return
      const next = { ...preferences, [key]: !preferences[key] }
      setSavingPref(key)
      setPreferences(next)
      try {
        await updateNotificationPreferences(next)
      } catch (err) {
        console.error('Failed to update preference:', err)
        setPreferences(preferences)
      } finally {
        setSavingPref(null)
      }
    },
    [preferences],
  )

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!supported) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {t('notSupported')}
        </p>
      </Card>
    )
  }

  if (!configured) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {t('notConfigured')}
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {permissionDenied && (
        <Card className="border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
            <p className="text-sm text-amber-200">
              {t('permissionDenied')}
            </p>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {subscribed
                ? t('subscribedTitle')
                : t('unsubscribedTitle')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {subscribed
                ? t('subscribedDesc')
                : t('unsubscribedDesc')}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t('devicesSubscribed', { count: endpointCount })}
            </p>
          </div>
          <Button
            variant={subscribed ? 'outline' : 'default'}
            onClick={toggleSubscription}
            disabled={toggling || permissionDenied}
          >
            {toggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : subscribed ? (
              <BellOff className="h-4 w-4" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            {subscribed ? t('unsubscribe') : t('subscribe')}
          </Button>
        </div>
      </Card>

      {preferences && (
        <Card className="p-6">
          <p className="mb-4 text-sm font-medium text-foreground">
            {t('preferencesTitle')}
          </p>
          <div className="space-y-3">
            {PREF_KEYS.map((key) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    {t(`pref_${key}`)}
                  </p>
                </div>
                <Switch
                  checked={preferences[key]}
                  onCheckedChange={() => togglePref(key)}
                  disabled={savingPref === key}
                />
              </label>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
