const CACHE_NAME = 'catalapp-v1'
const STATIC_ASSETS = [
  '/',
  '/gramatica',
  '/avaluacio',
  '/conversa',
  '/pronunciacio',
  '/dialegs',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network first for API, cache first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // API calls: network only (conversa IA needs real-time)
  if (url.pathname.startsWith('/conversa') && event.request.method === 'POST') {
    return
  }
  if (url.hostname.includes('execute-api')) {
    return
  }

  // Static assets: cache first, then network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      }).catch(() => {
        // Offline fallback for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/')
        }
      })
    })
  )
})
