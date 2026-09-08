/* VYBE service worker — app-shell + static caching only.
 * IMPORTANT: never cache API responses or any private/authenticated data.
 * API calls always go to the network so one user never sees another user's data.
 */
const CACHE = 'vybe-static-v1';
const OFFLINE_URL = '/offline.html';

// Static assets safe to precache (the shell + icons + offline page).
const PRECACHE = [
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // NEVER cache API or upload responses — these are dynamic/private. Always network.
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network-first, fall back to offline page when disconnected.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static assets (Next build output, icons, images): cache-first, then network.
  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    /\.(?:js|css|png|jpg|jpeg|svg|webp|gif|woff2?|ico)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          // Only cache successful, basic (same-origin) responses.
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        }).catch(() => cached);
      })
    );
  }
});
