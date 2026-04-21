const CACHE_NAME = 'catalapp-v3'
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

function isHashedAsset(url) {
  // Next.js fingerprints everything under /_next/static/ with a content hash
  return url.pathname.startsWith('/_next/static/')
}

function isAlwaysFresh(url) {
  // Daily content and manifest should always hit the network first
  return url.pathname.startsWith('/daily/') || url.pathname === '/manifest.json'
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)

  // Let cross-origin (API Gateway, etc.) bypass the SW entirely
  if (url.origin !== self.location.origin) return

  // Fingerprinted assets — cache-first is safe and fastest
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // HTML documents and anything else — network-first so updates land immediately;
  // fall back to cache only when offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && !isAlwaysFresh(url)) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone))
        }
        return response
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached
          if (event.request.mode === 'navigate') return caches.match('/')
          return Response.error()
        })
      )
  )
})
