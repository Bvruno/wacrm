import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/automations/admin-client'

interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
  badge?: string
}

/**
 * Send a push notification to all subscribed users in an account.
 */
export async function sendPushToAccount(
  accountId: string,
  payload: PushPayload,
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

  // First try direct account_id match
  const { data: direct, error: directErr } = await db
    .from('push_subscriptions')
    .select('user_id, endpoint, keys_p256dh, keys_auth')
    .eq('account_id', accountId)

  if (directErr) {
    console.error('[push] query by account_id failed:', directErr.message)
    return { sent: 0, failed: 0 }
  }

  let subs = direct ?? []

  // If no direct matches, try via profiles (user might have different account_id)
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
        .select('user_id, endpoint, keys_p256dh, keys_auth')
        .in('user_id', userIds)
      subs = viaMembers ?? []
    }
  }

  console.log(
    `[push] found ${subs.length} subscription(s) for account ${accountId}`,
  )

  if (subs.length === 0) return { sent: 0, failed: 0 }

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
          title: payload.title,
          body: payload.body,
          icon: payload.icon ?? '/codixia-icon.svg',
          badge: payload.badge ?? '/codixia-icon.svg',
          url: payload.url ?? '/',
        }),
      )
      sent++
    } catch (err) {
      console.error(`[push] send failed for user ${sub.user_id}:`, err)
      // 410 Gone / 404 Not Found — subscription expired, remove it
      if (
        err instanceof webpush.WebPushError &&
        (err.statusCode === 410 || err.statusCode === 404)
      ) {
        await db
          .from('push_subscriptions')
          .delete()
          .eq('user_id', sub.user_id)
          .eq('account_id', accountId)
      }
      failed++
    }
  }

  console.log(`[push] sent=${sent} failed=${failed}`)
  return { sent, failed }
}
