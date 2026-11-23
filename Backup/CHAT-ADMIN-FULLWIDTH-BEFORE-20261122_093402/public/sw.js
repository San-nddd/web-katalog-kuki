const CACHE_NAME = 'kuki-pwa-2026-10-16-v1'

const CORE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/assets/Kuki.png',
  '/icons/kuki-512.png',
  '/icons/kuki-512-maskable.png',
]

const IS_LOCALHOST =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1'

self.addEventListener('install', (event) => {
  self.skipWaiting()

  if (IS_LOCALHOST) {
    return
  }

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          CORE_ASSETS.map((asset) =>
            cache.add(asset).catch(() => null)
          )
        )
      )
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key !== CACHE_NAME)
              .map((key) => caches.delete(key))
          )
        ),
      self.clients.claim(),
    ])
  )
})

self.addEventListener('fetch', (event) => {
  if (IS_LOCALHOST) {
    return
  }

  const request = event.request

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  if (url.origin !== self.location.origin) {
    return
  }

  // Data API/chat/auth harus selalu real-time.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/sanctum/')
  ) {
    return
  }

  // Navigasi SPA: network dulu, fallback ke shell utama saat offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()

          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put('/', copy))
            .catch(() => {})

          return response
        })
        .catch(async () => {
          return (
            (await caches.match(request)) ||
            (await caches.match('/')) ||
            Response.error()
          )
        })
    )

    return
  }

  const staticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest'

  if (!staticAsset) {
    return
  }

  // Static asset: cache dulu, update diam-diam dari network.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkRequest = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone()

            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, copy))
              .catch(() => {})
          }

          return response
        })
        .catch(() => cached)

      return cached || networkRequest
    })
  )
})

self.addEventListener('push', (event) => {
  let payload = {}

  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      payload = {
        body: event.data.text(),
      }
    }
  }

  // Support payload langsung maupun payload.notification.
  const notification =
    payload.notification || payload

  const title =
    notification.title ||
    'Kuki Bakehouse Admin'

  const data = {
    ...(notification.data || {}),

    url:
      notification.data?.url ||
      notification.url ||
      '/admin/chat',
  }

  const options = {
    body:
      notification.body ||
      'Ada chat baru yang membutuhkan Admin.',

    icon:
      notification.icon ||
      '/icons/kuki-192.png',

    badge:
      notification.badge ||
      '/icons/kuki-192.png',

    tag:
      notification.tag ||
      'kuki-admin-chat',

    data,

    renotify: true,

    requireInteraction: false,

    vibrate: [200, 100, 200],

    actions:
      Array.isArray(notification.actions)
        ? notification.actions
        : [],
  }

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  )
})

self.addEventListener(
  'notificationclick',
  (event) => {
    event.notification.close()

    const target =
      event.notification.data?.url ||
      '/admin/chat'

    const targetUrl =
      new URL(
        target,
        self.location.origin
      ).href

    event.waitUntil(
      self.clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        .then(async (clients) => {
          for (const client of clients) {
            if (
              new URL(client.url).origin ===
              self.location.origin
            ) {
              await client.navigate(
                targetUrl
              )

              return client.focus()
            }
          }

          if (self.clients.openWindow) {
            return self.clients.openWindow(
              targetUrl
            )
          }

          return undefined
        })
    )
  }
)
