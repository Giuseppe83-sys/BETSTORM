// BetStorm Service Worker v1.0
const CACHE_NAME = 'betstorm-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/teams.js',
  '/cookie-banner.js',
  '/logo.jpg',
  '/manifest.json'
];

// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API/data, cache-first for static
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first for Supabase data (always fresh predictions)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Network-first for same-origin HTML (fresh content)
  if (url.origin === self.location.origin && event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (JS, images, fonts)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Network-first for everything else (CDNs, etc.)
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
