'use server'

import webpush from 'web-push'

function ensureVapid(): { publicKey: string; privateKey: string } {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env')
  }
  return { publicKey, privateKey }
}

// In-memory subscription store. Replace with a database table
// (e.g. push_subscriptions) for persistence across restarts.
let _subscription: webpush.PushSubscription | null = null

export async function subscribeUser(sub: webpush.PushSubscription) {
  const { publicKey, privateKey } = ensureVapid()
  webpush.setVapidDetails('mailto:support@wacrm.app', publicKey, privateKey)
  _subscription = sub
  return { success: true }
}

export async function unsubscribeUser() {
  _subscription = null
  return { success: true }
}

export async function sendNotification(message: string) {
  if (!_subscription) throw new Error('No subscription — subscribe first')
  const { publicKey, privateKey } = ensureVapid()
  webpush.setVapidDetails('mailto:support@wacrm.app', publicKey, privateKey)
  try {
    await webpush.sendNotification(
      _subscription,
      JSON.stringify({
        title: 'wacrm',
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
  return {
    configured: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    subscribed: !!_subscription,
  }
}
