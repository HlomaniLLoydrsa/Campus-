'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Users } from 'lucide-react';
import Logo from '@/components/Logo';

function JoinGroupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const code = searchParams.get('code') || '';
  const [group, setGroup] = useState<{ id: string; name: string; description: string; image: string; memberCount: number; alreadyMember: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  // If not signed in, send to login and come back to this invite afterwards.
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/join-group?code=${code}`)}`);
    }
  }, [user, isLoading, router, code]);

  useEffect(() => {
    if (!user || !code) { if (!code) { setError('No invite code in this link.'); setLoading(false); } return; }
    fetch(`/api/groups/join?code=${encodeURIComponent(code)}`, { credentials: 'include' })
      .then(async r => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { setError(d.error || 'This invite link is invalid.'); return; }
        setGroup(d);
        if (d.alreadyMember) router.replace(`/messages?conversation=${d.id}`);
      })
      .catch(() => setError('Could not load this invite.'))
      .finally(() => setLoading(false));
  }, [user, code, router]);

  const join = async () => {
    if (!group) return;
    setJoining(true);
    try {
      const r = await fetch('/api/groups/join', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.id) { router.replace(`/messages?conversation=${d.id}`); return; }
      setError(d.error || 'Could not join the group.');
      setJoining(false);
    } catch { setError('Network error'); setJoining(false); }
  };

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
        <div className="mx-auto mb-3 w-fit"><Logo size={44} /></div>
        {loading ? (
          <p className="text-sm text-gray-400 py-6">Loading invite…</p>
        ) : error ? (
          <>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button onClick={() => router.replace('/messages')} className="btn-primary w-full">Go to Messages</button>
          </>
        ) : group ? (
          <>
            {group.image
              ? <img src={group.image} alt="" className="w-20 h-20 rounded-2xl object-cover mx-auto mb-3" />
              : <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-campus-primary to-campus-accent flex items-center justify-center mx-auto mb-3"><Users size={30} className="text-white" /></div>}
            <h1 className="text-xl font-bold">{group.name}</h1>
            {group.description && <p className="text-sm text-gray-500 mt-1">{group.description}</p>}
            <p className="text-xs text-gray-400 mt-2">{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</p>
            <button onClick={join} disabled={joining} className="btn-primary w-full mt-5 disabled:opacity-50">{joining ? 'Joining…' : 'Join Group'}</button>
            <button onClick={() => router.replace('/messages')} className="w-full mt-2 text-sm text-gray-400 hover:text-gray-600">Not now</button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function JoinGroupPage() {
  return (
    <Suspense fallback={null}>
      <JoinGroupContent />
    </Suspense>
  );
}
