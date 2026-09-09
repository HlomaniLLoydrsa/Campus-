'use client';

import { useEffect } from 'react';

// Ensure every API request carries the session cookie. Same-origin requests
// (installed PWA) already do, but this guarantees it and future-proofs a
// Capacitor build. Runs once, module-scope, before any component fetches.
if (typeof window !== 'undefined' && !(window as any).__vybeFetchPatched) {
  (window as any).__vybeFetchPatched = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url);
    if (url && url.includes('/api/')) {
      init = { credentials: 'include', ...(init || {}) };
    }
    return originalFetch(input as any, init);
  };
}

/**
 * Registers the PWA service worker on the client.
 * Kept in its own component so the root layout can stay a server component.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Register after load so it never blocks first paint.
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* SW registration failing should never break the app */
      });
    };
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
