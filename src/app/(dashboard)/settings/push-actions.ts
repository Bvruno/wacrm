'use server'

import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { createClient } from '@/lib/supabase/server'
import type { NotificationPreferences } from '@/types'
import { sendPushToAccount } from '@/lib/push/send-push'

const DEFAULT_PREFERENCES: NotificationPreferences = {
  new_message: true,
  conversation_assigned: true,
  broadcast_completed: false,
  contact_imported: false,
  automation_failed: false,
}

export async function subscribeUser(sub: {
  endpoint: string
  keys: { p256dh: string; auth: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', user.id)
    .single()
  if (!profile?.account_id) throw new Error('No account')

  const db = supabaseAdmin()
  const { error } = await db.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      account_id: profile.account_id,
      endpoint: sub.endpoint,
      keys_p256dh: sub.keys.p256dh,
      keys_auth: sub.keys.auth,
    },
    { onConflict: 'user_id,endpoint' },
  )
  if (error) throw new Error(error.message)
  return { success: true }
}

export async function unsubscribeUser(endpoint?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const db = supabaseAdmin()
  let query = db.from('push_subscriptions').delete().eq('user_id', user.id)
  if (endpoint) {
    query = query.eq('endpoint', endpoint)
  }
  await query
  return { success: true }
}

export async function sendTestNotification(message?: string) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    return { success: false, error: 'VAPID keys not configured' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const db = supabaseAdmin()
  const { data: subs } = await db
    .from('push_subscriptions')
    .select('endpoint, keys_p256dh, keys_auth')
    .eq('user_id', user.id)

  if (!subs || subs.length === 0) {
    return { success: false, error: 'No subscription' }
  }

  webpush.setVapidDetails('mailto:support@wacrm.app', publicKey, privateKey)

  let sent = 0
  let failed = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        },
        JSON.stringify({
          title: 'CodixIA',
          body: message || 'This is a test notification.',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          url: '/',
          tag: 'test-notification',
          renotify: true,
          requireInteraction: false,
          timestamp: Date.now(),
        }),
        {
          TTL: 300,
          urgency: 'high',
          topic: 'test-notification',
        },
      )
      sent++
    } catch (error) {
      console.error('[push] sendTestNotification failed:', error)
      if (
        error instanceof webpush.WebPushError &&
        (error.statusCode === 410 || error.statusCode === 404)
      ) {
        await db
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', sub.endpoint)
      }
      failed++
    }
  }

  return { success: true, sent, failed }
}

export async function getSubscriptionStatus(): Promise<{
  configured: boolean
  subscribed: boolean
  endpoints: string[]
  staleEndpoints: string[]
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      configured: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      subscribed: false,
      endpoints: [],
      staleEndpoints: [],
    }
  }

  const db = supabaseAdmin()
  const { data: subs } = await db
    .from('push_subscriptions')
    .select('endpoint')
    .eq('user_id', user.id)

  return {
    configured: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    subscribed: (subs?.length ?? 0) > 0,
    endpoints: subs?.map((s) => s.endpoint) ?? [],
    staleEndpoints: [],
  }
}

export async function healthCheckSubscription(localEndpoint: string): Promise<{
  valid: boolean
  reason?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { valid: false, reason: 'Unauthorized' }

  const db = supabaseAdmin()
  const { data: subs } = await db
    .from('push_subscriptions')
    .select('endpoint')
    .eq('user_id', user.id)
    .eq('endpoint', localEndpoint)

  if (!subs || subs.length === 0) {
    return { valid: false, reason: 'Subscription not found on server' }
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    return { valid: false, reason: 'VAPID keys not configured' }
  }

  return { valid: true }
}

export async function clearStaleSubscription(localEndpoint: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const db = supabaseAdmin()
  await db
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', localEndpoint)

  return { success: true }
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return DEFAULT_PREFERENCES

  const db = supabaseAdmin()
  const { data: subs } = await db
    .from('push_subscriptions')
    .select('preferences')
    .eq('user_id', user.id)
    .not('preferences', 'is', null)
    .limit(1)

  const prefs = subs?.[0]?.preferences
  if (!prefs) return DEFAULT_PREFERENCES
  return { ...DEFAULT_PREFERENCES, ...(prefs as Partial<NotificationPreferences>) }
}

export async function updateNotificationPreferences(
  preferences: NotificationPreferences,
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const db = supabaseAdmin()
  const { error } = await db
    .from('push_subscriptions')
    .update({ preferences })
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  return { success: true }
}

export async function notifyPushEvent(
  accountId: string,
  eventType: keyof NotificationPreferences,
  payload: {
    title: string
    body: string
    url?: string
    conversationId?: string
    messageId?: string
    contactId?: string
    image?: string
    actions?: { action: string; title: string }[]
    tag?: string
    unreadCount?: number
  },
) {
  const result = await sendPushToAccount(accountId, payload, eventType)
  return { sent: result.sent, failed: result.failed }
}
