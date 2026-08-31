'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const clearAndReload = () => {
    try { localStorage.removeItem('campus_user'); } catch {}
    window.location.href = '/welcome';
  };

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', padding: 16 }}>
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>The app hit an error.</p>
            {error?.message && (
              <p style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', borderRadius: 8, padding: 12, marginBottom: 16, wordBreak: 'break-word', fontFamily: 'monospace' }}>{error.message}</p>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => reset()} style={{ padding: '8px 16px', borderRadius: 12, border: '1px solid #ddd', background: '#f1f1f1', cursor: 'pointer' }}>Try Again</button>
              <button onClick={clearAndReload} style={{ padding: '8px 16px', borderRadius: 12, border: 'none', background: '#1A3F75', color: 'white', cursor: 'pointer' }}>Reset Session</button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
