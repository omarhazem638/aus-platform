// AUS Service Worker — v5.1 (Network-first; never caches /api/ backend calls)
const CACHE = 'aus-v8';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/star_map.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=Orbitron:wght@400;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Install: warm minimal cache, then take over
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(ASSETS.map(url => c.add(url).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

// Activate: nuke ALL old caches & claim all tabs
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      // Delete every cache (even other versions) so stale JS dies immediately
      keys.map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Fetch: ALWAYS try network first for JS/HTML/JSON, fallback to cache only on failure
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // NEVER intercept/cache API calls (the FastAPI backend on :8002) — they must
  // always hit the network so catalog/results sync stays fresh.
  if (url.pathname.indexOf('/api/') !== -1 || url.port === '8002') return;
  const isLocal = url.origin === self.location.origin;
  const isFresh = isLocal && (/\.(js|html|json)(\?|$)/.test(url.pathname + url.search) || url.pathname === '/');

  if (isFresh) {
    // NETWORK-FIRST for code/data — guarantees freshness
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(res => {
          // Update cache in background
          if (res && res.status === 200 && res.type !== 'opaque') {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  // CACHE-FIRST for fonts/icons/static assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
        }
        return res;
      }).catch(() => isLocal ? caches.match('/index.html') : null);
    })
  );
});
