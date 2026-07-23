const CACHE_NAME = 'codixia-v1'
const OFFLINE_URL = '/offline.html'

const PRECACHE_URLS = [
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
  '/codixia-icon.svg',
]

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS)
    }).then(function () {
      return self.skipWaiting()
    }),
  )
})

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME })
          .map(function (key) { return caches.delete(key) }),
      )
    }).then(function () {
      return self.clients.claim()
    }),
  )
})

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(function () {
        return caches.match(OFFLINE_URL)
      }),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      const fetched = fetch(event.request)
        .then(function (response) {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }
          const clone = response.clone()
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone)
          })
          return response
        })
        .catch(function () {
          return cached || new Response('Offline', { status: 503 })
        })
      return cached || fetched
    }),
  )
})

self.addEventListener('push', function (event) {
  if (event.data) {
    var data = event.data.json()
    var options = {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
        url: data.url || '/',
      },
    }
    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  var url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i]
        if (client.url.indexOf(self.location.origin) !== -1 && 'navigate' in client) {
          return client.navigate(url).then(function () {
            return client.focus()
          })
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    }),
  )
})

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
