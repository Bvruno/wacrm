'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, BellOff, Loader2 } from 'lucide-react'

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
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [savingPref, setSavingPref] = useState<string | null>(null)

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window)
    getSubscriptionStatus().then((s) => {
      setConfigured(s.configured)
      setSubscribed(s.subscribed)
      setLoading(false)
    })
    getNotificationPreferences().then(setPreferences)
  }, [])

  async function toggleSubscription() {
    setToggling(true)
    try {
      if (subscribed) {
        await unsubscribeUser()
        setSubscribed(false)
      } else {
        const registration = await navigator.serviceWorker.ready
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
          ),
        })
        const serialized = JSON.parse(JSON.stringify(sub))
        await subscribeUser(serialized)
        setSubscribed(true)
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
        <p className="text-sm text-muted-foreground">{t('notSupported')}</p>
      </Card>
    )
  }

  if (!configured) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">{t('notConfigured')}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {subscribed ? t('subscribedTitle') : t('unsubscribedTitle')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {subscribed ? t('subscribedDesc') : t('unsubscribedDesc')}
            </p>
          </div>
          <Button
            variant={subscribed ? 'outline' : 'default'}
            onClick={toggleSubscription}
            disabled={toggling}
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

      {subscribed && preferences && (
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
