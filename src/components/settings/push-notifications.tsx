'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, BellOff, Loader2, Send, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { subscribeUser, unsubscribeUser, sendNotification, getSubscriptionStatus } from '@/app/(dashboard)/settings/push-actions'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return new Uint8Array(rawData.length).map((_, i) => rawData.charCodeAt(i))
}

export function PushNotifications() {
  const t = useTranslations('Settings.push')
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window)
    getSubscriptionStatus().then((s) => {
      setConfigured(s.configured)
      setSubscribed(s.subscribed)
      setLoading(false)
    })
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
      }
    } catch (err) {
      console.error('Failed to toggle subscription:', err)
    } finally {
      setToggling(false)
    }
  }

  async function handleSend() {
    if (!message.trim()) return
    setSending(true)
    setSent(false)
    try {
      await sendNotification(message)
      setSent(true)
      setMessage('')
      setTimeout(() => setSent(false), 3000)
    } catch (err) {
      console.error('Failed to send test notification:', err)
    } finally {
      setSending(false)
    }
  }

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

      {subscribed && (
        <Card className="p-6">
          <p className="mb-3 text-sm font-medium text-foreground">
            {t('testTitle')}
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('testPlaceholder')}
              className="bg-muted text-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend()
              }}
            />
            <Button
              variant="secondary"
              onClick={handleSend}
              disabled={sending || !message.trim()}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : sent ? (
                <Check className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t('send')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
