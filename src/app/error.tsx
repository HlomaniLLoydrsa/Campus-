'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  const clearAndReload = () => {
    try { localStorage.removeItem('campus_user'); } catch {}
    window.location.href = '/welcome';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-2">The page hit an error. Try again, or reset your session.</p>
        {error?.message && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3 mb-4 break-words font-mono">{error.message}</p>
        )}
        <div className="flex gap-2 justify-center">
          <button onClick={() => reset()} className="btn-secondary text-sm">Try Again</button>
          <button onClick={clearAndReload} className="btn-primary text-sm">Reset Session</button>
        </div>
      </div>
    </div>
  );
}
