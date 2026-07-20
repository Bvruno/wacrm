'use server'

import webpush from 'web-push'

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:support@wacrm.app',
    vapidPublicKey,
    vapidPrivateKey,
  )
}

// In-memory subscription store. Replace with a database table
// (e.g. push_subscriptions) for persistence across restarts.
let _subscription: webpush.PushSubscription | null = null

export async function subscribeUser(sub: webpush.PushSubscription) {
  if (!vapidPublicKey) {
    throw new Error('VAPID public key not configured')
  }
  _subscription = sub
  return { success: true }
}

export async function unsubscribeUser() {
  _subscription = null
  return { success: true }
}

export async function sendNotification(message: string) {
  if (!_subscription) {
    throw new Error('No subscription — subscribe first')
  }
  if (!vapidPublicKey) {
    throw new Error('VAPID keys not configured')
  }
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
    configured: !!vapidPublicKey,
    subscribed: !!_subscription,
  }
}
