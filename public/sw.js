/* VYBE service worker — app-shell + static caching only.
 * IMPORTANT: never cache API responses or any private/authenticated data.
 * API calls always go to the network so one user never sees another user's data.
 */
const CACHE = 'vybe-static-v3';
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

  // Static assets (Next build output, icons, images).
  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    /\.(?:js|css|png|jpg|jpeg|svg|webp|gif|woff2?|ico)$/.test(url.pathname);

  if (isStatic) {
    // NETWORK-FIRST: always try to fetch the freshest asset, fall back to cache
    // only when offline. Next.js fingerprints its build files, so serving a
    // cached copy first (the old strategy) caused stale UI that never updated.
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req))
    );
  }
});
