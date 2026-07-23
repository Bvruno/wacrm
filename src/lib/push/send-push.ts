import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import type { NotificationPreferences } from '@/types'

interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
  badge?: string
  image?: string
  tag?: string
  conversationId?: string
  messageId?: string
  contactId?: string
  actions?: PushAction[]
  silent?: boolean
  vibrate?: number[]
  renotify?: boolean
  requireInteraction?: boolean
  timestamp?: number
  sound?: string | false
  unreadCount?: number
  payload?: Record<string, unknown>
}

interface PushAction {
  action: string
  title: string
  icon?: string
}

interface SendOptions {
  ttl?: number
  urgency?: 'very-low' | 'low' | 'normal' | 'high'
  topic?: string
}

const DEFAULT_OPTIONS: SendOptions = {
  ttl: 86400,
  urgency: 'high',
}

/**
 * Send a push notification to all subscribed users in an account.
 * When `eventType` is provided, only users who have that preference
 * enabled will receive the notification.
 */
export async function sendPushToAccount(
  accountId: string,
  payload: PushPayload,
  eventType?: keyof NotificationPreferences,
  sendOpts?: SendOptions,
): Promise<{ sent: number; failed: number }> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    console.warn('[push] VAPID keys missing in environment')
    return { sent: 0, failed: 0 }
  }

  webpush.setVapidDetails('mailto:support@wacrm.app', publicKey, privateKey)

  const db = supabaseAdmin()
  console.log('[push] looking up subscriptions for account', accountId)

  const { data: direct, error: directErr } = await db
    .from('push_subscriptions')
    .select('user_id, endpoint, keys_p256dh, keys_auth, preferences')
    .eq('account_id', accountId)

  if (directErr) {
    console.error('[push] query by account_id failed:', directErr.message)
    return { sent: 0, failed: 0 }
  }

  let subs = direct ?? []

  if (subs.length === 0) {
    console.log('[push] no direct matches, trying via profiles')
    const { data: members } = await db
      .from('profiles')
      .select('user_id')
      .eq('account_id', accountId)

    if (members && members.length > 0) {
      const userIds = members.map((m: { user_id: string }) => m.user_id)
      const { data: viaMembers } = await db
        .from('push_subscriptions')
        .select('user_id, endpoint, keys_p256dh, keys_auth, preferences')
        .in('user_id', userIds)
      subs = viaMembers ?? []
    }
  }

  console.log(
    `[push] found ${subs.length} subscription(s) for account ${accountId}`,
  )

  if (subs.length === 0) return { sent: 0, failed: 0 }

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? '/icon-192.png',
    badge: payload.badge ?? '/icon-192.png',
    image: payload.image,
    url: payload.url ?? '/',
    tag: payload.tag ?? payload.conversationId,
    conversationId: payload.conversationId,
    messageId: payload.messageId,
    contactId: payload.contactId,
    actions: payload.actions,
    silent: payload.silent ?? false,
    vibrate: payload.vibrate ?? [100, 50, 100],
    renotify: payload.renotify ?? true,
    requireInteraction: payload.requireInteraction ?? true,
    timestamp: payload.timestamp ?? Date.now(),
    sound: payload.sound,
    unreadCount: payload.unreadCount,
    payload: payload.payload,
  })

  const options = { ...DEFAULT_OPTIONS, ...sendOpts }

  let sent = 0
  let failed = 0

  for (const sub of subs) {
    if (eventType && sub.preferences) {
      const prefs = sub.preferences as Partial<NotificationPreferences>
      if (prefs[eventType] === false) {
        continue
      }
    }

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        },
        message,
        {
          TTL: options.ttl,
          urgency: options.urgency,
          topic: payload.tag ?? payload.conversationId ?? options.topic,
        },
      )
      sent++
    } catch (err) {
      console.error(`[push] send failed for user ${sub.user_id}:`, err)
      if (
        err instanceof webpush.WebPushError &&
        (err.statusCode === 410 || err.statusCode === 404)
      ) {
        await db
          .from('push_subscriptions')
          .delete()
          .eq('user_id', sub.user_id)
          .eq('endpoint', sub.endpoint)
      }
      failed++
    }
  }

  console.log(`[push] sent=${sent} failed=${failed}`)
  return { sent, failed }
}
