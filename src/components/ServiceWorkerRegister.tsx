'use client';

import { useEffect } from 'react';

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
