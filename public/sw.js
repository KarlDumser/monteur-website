const CACHE_NAME = 'monteurwohnung-v3'
const URLS_TO_CACHE = [
  '/site.webmanifest',
  '/admin-app.webmanifest',
  '/admin-install.html',
  '/favicon.svg',
  '/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  // Always prefer fresh HTML/navigation responses to avoid stale index.html pointing to removed hashed bundles.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html')),
    )
    return
  }

  const requestUrl = new URL(event.request.url)
  const isStaticAsset = requestUrl.pathname.startsWith('/assets/')

  if (isStaticAsset) {
    // For hashed build assets we can serve cached quickly while updating in the background.
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response && response.ok) {
              const responseClone = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone))
            }
            return response
          })

        return cachedResponse || networkFetch
      }),
    )
    return
  }

  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)))
})
