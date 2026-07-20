'use server'

import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { createClient } from '@/lib/supabase/server'

export async function subscribeUser(sub: {
  endpoint: string
  keys: { p256dh: string; auth: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
    { onConflict: 'user_id' },
  )
  if (error) throw new Error(error.message)
  return { success: true }
}

export async function unsubscribeUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const db = supabaseAdmin()
  await db.from('push_subscriptions').delete().eq('user_id', user.id)
  return { success: true }
}

export async function sendNotification(message: string) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    return { success: false, error: 'VAPID keys not configured' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const db = supabaseAdmin()
  const { data: sub } = await db
    .from('push_subscriptions')
    .select('endpoint, keys_p256dh, keys_auth')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!sub) return { success: false, error: 'No subscription — subscribe first' }

  webpush.setVapidDetails('mailto:support@wacrm.app', publicKey, privateKey)

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
      JSON.stringify({
        title: 'CodixIA',
        body: message,
        icon: '/codixia-icon.svg',
        badge: '/codixia-icon.svg',
        url: '/',
      }),
    )
    return { success: true }
  } catch (error) {
    console.error('Error sending push notification:', error)
    return { success: false, error: 'Failed to send notification' }
  }
}

export async function getSubscriptionStatus(): Promise<{
  configured: boolean
  subscribed: boolean
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { configured: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, subscribed: false }

  const db = supabaseAdmin()
  const { data: sub } = await db
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  return {
    configured: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    subscribed: !!sub,
  }
}
