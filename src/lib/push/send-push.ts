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
    console.warn('[push] publicKey:', !!publicKey, 'privateKey:', !!privateKey)
    return { sent: 0, failed: 0 }
  }

  webpush.setVapidDetails('mailto:support@wacrm.app', publicKey, privateKey)

  const db = supabaseAdmin()
  console.log(
    `[push] sendPushToAccount called: accountId=${accountId} eventType=${eventType ?? 'none'}`,
  )

  const { data: direct, error: directErr } = await db
    .from('push_subscriptions')
    .select('user_id, endpoint, keys_p256dh, keys_auth, preferences')
    .eq('account_id', accountId)

  if (directErr) {
    console.error('[push] query by account_id failed:', directErr.message)
    console.error('[push] full error:', JSON.stringify(directErr))
    return { sent: 0, failed: 0 }
  }

  let subs = direct ?? []
  console.log(
    `[push] direct query returned ${subs.length} subscription(s)`,
  )

  if (subs.length === 0) {
    console.log(
      `[push] no subscriptions with account_id=${accountId}, trying via profiles`,
    )
    const { data: members } = await db
      .from('profiles')
      .select('user_id')
      .eq('account_id', accountId)

    console.log(
      `[push] profiles for account found: ${members?.length ?? 0}`,
    )

    if (members && members.length > 0) {
      const userIds = members.map((m: { user_id: string }) => m.user_id)
      console.log(`[push] looking up subs for userIds: ${userIds.join(', ')}`)
      const { data: viaMembers } = await db
        .from('push_subscriptions')
        .select('user_id, endpoint, keys_p256dh, keys_auth, preferences')
        .in('user_id', userIds)
      subs = viaMembers ?? []
      console.log(
        `[push] via-profiles query returned ${subs.length} subscription(s)`,
      )
    }
  }

  if (subs.length === 0) {
    console.warn(
      `[push] ZERO subscriptions found for account ${accountId}. ` +
      `Push notification will NOT be sent. Check that: ` +
      `(1) a user in this account has enabled push notifications via Settings, ` +
      `(2) the push_subscriptions.account_id column matches this account_id.`,
    )
    return { sent: 0, failed: 0 }
  }

  const messageObj = {
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
    requireInteraction: payload.requireInteraction ?? false,
    timestamp: payload.timestamp ?? Date.now(),
    sound: payload.sound,
    unreadCount: payload.unreadCount,
    payload: payload.payload,
  }

  const message = JSON.stringify(messageObj)
  console.log(
    `[push] payload: title="${messageObj.title}" body="${messageObj.body.substring(0, 80)}" url="${messageObj.url}"`,
  )

  const options = { ...DEFAULT_OPTIONS, ...sendOpts }

  let sent = 0
  let failed = 0

  for (const sub of subs) {
    if (eventType) {
      const prefsObj = sub.preferences as Partial<NotificationPreferences> | null
      if (!prefsObj || typeof prefsObj !== 'object') {
        console.log(
          `[push] subscription for user ${sub.user_id} has no preferences object (${JSON.stringify(sub.preferences)}), sending anyway`,
        )
      } else {
        const prefValue = prefsObj[eventType]
        console.log(
          `[push] user ${sub.user_id}: eventType=${eventType} pref=${prefValue}`,
        )
        if (prefValue === false) {
          console.log(
            `[push] skipping user ${sub.user_id}: ${eventType} preference is false`,
          )
          continue
        }
      }
    }

    try {
      console.log(`[push] sending to user ${sub.user_id} at endpoint ${sub.endpoint.substring(0, 60)}...`)
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
      console.log(`[push] sent successfully to user ${sub.user_id}`)
    } catch (err) {
      const status =
        err instanceof webpush.WebPushError
          ? err.statusCode
          : 'unknown'
      console.error(
        `[push] send failed for user ${sub.user_id}: status=${status} body=${err instanceof Error ? err.message : String(err)}`,
      )
      if (
        err instanceof webpush.WebPushError &&
        (err.statusCode === 410 || err.statusCode === 404)
      ) {
        console.log(
          `[push] removing stale subscription for user ${sub.user_id}`,
        )
        await db
          .from('push_subscriptions')
          .delete()
          .eq('user_id', sub.user_id)
          .eq('endpoint', sub.endpoint)
      }
      failed++
    }
  }

  console.log(`[push] done: sent=${sent} failed=${failed}`)
  return { sent, failed }
}
