'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/** Shows a small banner when the device loses its internet connection. */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[60] bg-amber-500 text-white text-xs font-medium py-1.5 px-3 flex items-center justify-center gap-2">
      <WifiOff size={14} />
      You&apos;re offline. Some features may not work until you reconnect.
    </div>
  );
}
