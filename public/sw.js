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
      var fetched = fetch(event.request)
        .then(function (response) {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }
          var clone = response.clone()
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
  if (!event.data) {
    if (event.waitUntil) {
      event.waitUntil(
        self.registration.showNotification('CodixIA', {
          body: 'New activity',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        }),
      )
    }
    return
  }

  var data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'CodixIA', body: event.data.text() }
  }

  if (data && data.silent) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
        clients.forEach(function (client) {
          client.postMessage({ type: 'BACKGROUND_SYNC', payload: data.payload || {} })
        })
      }),
    )
    return
  }

  var options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    image: data.image || undefined,
    vibrate: data.vibrate || [100, 50, 100],
    tag: data.tag || undefined,
    renotify: data.renotify !== undefined ? data.renotify : true,
    requireInteraction: data.requireInteraction !== undefined ? data.requireInteraction : false,
    timestamp: data.timestamp || Date.now(),
    silent: data.sound === false,
    data: {
      dateOfArrival: Date.now(),
      url: data.url || '/',
      conversationId: data.conversationId || null,
      messageId: data.messageId || null,
      contactId: data.contactId || null,
    },
  }

  if (data.actions && Array.isArray(data.actions) && data.actions.length > 0) {
    options.actions = data.actions.slice(0, 2)
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'CodixIA', options).then(function () {
      if ('setAppBadge' in self.navigator && typeof self.navigator.setAppBadge === 'function') {
        var unread = data.unreadCount
        if (typeof unread === 'number' && unread > 0) {
          return self.navigator.setAppBadge(unread)
        }
      }
    }),
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  var url = '/'
  var action = event.action

  if (event.notification.data) {
    var data = event.notification.data
    if (data && data.url) {
      url = data.url
    }

    if (data && action === 'mark-read' && data.messageId) {
      url = data.url || '/inbox'
      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
          for (var i = 0; i < clientList.length; i++) {
            var client = clientList[i]
            if (client.url.indexOf(self.location.origin) !== -1) {
              client.postMessage({
                type: 'MARK_READ',
                messageId: data.messageId,
                conversationId: data.conversationId,
              })
              return client.focus()
            }
          }
          if (self.clients.openWindow) {
            return self.clients.openWindow(url)
          }
        }),
      )
      return
    }

    if (data && action === 'reply' && data.conversationId) {
      url = data.url || '/inbox?conversation=' + data.conversationId
    }

    if (data && action === 'view-contact' && data.contactId) {
      url = '/contacts/' + data.contactId
    }
  }

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

self.addEventListener('notificationclose', function (event) {
  if (event.notification.data && event.notification.data.messageId) {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      clientList.forEach(function (client) {
        client.postMessage({
          type: 'NOTIFICATION_DISMISSED',
          messageId: event.notification.data.messageId,
          conversationId: event.notification.data.conversationId,
        })
      })
    })
  }
})

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'CLEAR_BADGE') {
    if ('setAppBadge' in self.navigator && typeof self.navigator.setAppBadge === 'function') {
      event.waitUntil(self.navigator.clearAppBadge())
    }
  }
})
