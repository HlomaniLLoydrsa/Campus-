'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { useFeedback } from '@/context/FeedbackContext';
import { LostFoundItem, lfCategoryMeta } from '@/lib/lostfound';
import { ArrowLeft, MapPin, Calendar, Flag, Trash2, CheckCircle, Search as SearchIcon } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

export default function LostFoundDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { currentUser, getUserById, reportContent } = useApp();
  const { confirm, toast } = useFeedback();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reported, setReported] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const [claimAnswer, setClaimAnswer] = useState('');
  const [claimSent, setClaimSent] = useState(false);

  const load = async () => {
    try { const res = await fetch(`/api/lost-found/${id}`); if (res.ok) setItem(await res.json()); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const patch = async (body: any) => {
    const res = await fetch(`/api/lost-found/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.ok ? res.json() : null;
  };

  if (loading) return <div className="flex min-h-screen"><Sidebar /><main className="flex-1"><TopBar /><div className="max-w-2xl mx-auto px-4 py-6"><div className="card h-64 animate-pulse bg-gray-100" /></div></main><BottomNav /></div>;
  if (!item) return <div className="flex min-h-screen"><Sidebar /><main className="flex-1"><TopBar /><div className="flex items-center justify-center h-96 text-gray-500">Item not found</div></main><BottomNav /></div>;

  const meta = lfCategoryMeta(item.category);
  const reporter = getUserById(item.reporterId);
  const isOwner = item.reporterId === currentUser.id;

  const submitClaim = async () => {
    const ok = await patch({ action: 'claim', answer: claimAnswer });
    if (ok) { setClaimSent(true); setShowClaim(false); }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => router.push('/lost-found')} className="flex items-center gap-1 text-sm text-campus-primary font-medium mb-4 hover:underline"><ArrowLeft size={14} /> Lost &amp; Found</button>

          <div className="card overflow-hidden">
            <div className="h-56 bg-gray-100 flex items-center justify-center">
              {item.photo ? <img src={item.photo} alt="" className="w-full h-full object-contain" /> : <span className="text-6xl">{meta.emoji}</span>}
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`badge-pill text-xs ${item.kind === 'lost' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{item.kind === 'lost' ? 'Lost' : 'Found'}</span>
                <span className="badge-pill bg-gray-100 text-gray-600 text-xs">{meta.emoji} {meta.label}</span>
                {item.status === 'recovered' && <span className="badge-pill bg-green-100 text-green-700 text-xs">Recovered ✓</span>}
              </div>
              <h1 className="font-bold text-lg">{item.itemName}</h1>
              {item.description && <p className="text-sm text-gray-700 mt-2">{item.description}</p>}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                {item.location && <span className="flex items-center gap-1"><MapPin size={14} /> {item.location}</span>}
                {item.campus && <span className="flex items-center gap-1"><SearchIcon size={14} /> {item.campus}</span>}
                {item.dateOn && <span className="flex items-center gap-1"><Calendar size={14} /> {item.dateOn}</span>}
              </div>
              {reporter && <Link href={`/profile/${reporter.id}`} className="text-xs text-gray-500 mt-2 inline-block hover:text-campus-primary">Reported by {reporter.name} · {formatTimeAgo(item.createdAt)}</Link>}

              {/* Actions */}
              <div className="mt-5 flex flex-wrap gap-2">
                {isOwner ? (
                  <>
                    {item.status !== 'recovered' && <button onClick={async () => { const d = await patch({ action: 'recover' }); if (d) setItem({ ...item, status: 'recovered' }); }} className="btn-primary text-sm flex items-center gap-1"><CheckCircle size={15} /> Mark Recovered</button>}
                    <button onClick={async () => { const ok = await confirm({ title: 'Delete this report?', confirmText: 'Delete', destructive: true }); if (ok) { await fetch(`/api/lost-found/${id}`, { method: 'DELETE' }); toast('Report deleted'); router.push('/lost-found'); } }} className="px-3 py-2 rounded-xl border border-red-200 text-red-500 text-sm flex items-center gap-1"><Trash2 size={15} /> Delete</button>
                  </>
                ) : item.status !== 'recovered' ? (
                  <>
                    <button onClick={() => setShowClaim(true)} disabled={claimSent} className="btn-primary text-sm disabled:opacity-50">{claimSent ? 'Claim sent ✓' : (item.kind === 'found' ? "This is mine" : "I found this")}</button>
                    <button onClick={() => { reportContent('lostfound', item.id, ''); setReported(true); }} disabled={reported} className="px-3 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm flex items-center gap-1 disabled:opacity-50"><Flag size={15} /> {reported ? 'Reported' : 'Report'}</button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Owner: pending claims */}
          {isOwner && item.claims && item.claims.length > 0 && (
            <div className="card p-4 mt-4">
              <p className="font-semibold text-sm mb-3">Claims ({item.claims.length})</p>
              <div className="space-y-3">
                {item.claims.map((c: any) => {
                  const u = getUserById(c.claimantId);
                  return (
                    <div key={c.id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <Link href={`/profile/${c.claimantId}`} className="text-sm font-medium hover:text-campus-primary">{u?.name || 'Someone'}</Link>
                        <span className={`badge-pill text-[10px] ${c.status === 'approved' ? 'bg-green-100 text-green-700' : c.status === 'rejected' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>{c.status}</span>
                      </div>
                      {item.secretQuestion && <p className="text-[11px] text-gray-400 mt-1">Q: {item.secretQuestion}</p>}
                      <p className="text-sm text-gray-700 mt-1 italic">&quot;{c.answer || '(no answer)'}&quot;</p>
                      {c.status === 'pending' && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={async () => { await patch({ action: 'resolveClaim', claimId: c.id, decision: 'approved' }); load(); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white">Approve</button>
                          <button onClick={async () => { await patch({ action: 'resolveClaim', claimId: c.id, decision: 'rejected' }); load(); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600">Reject</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Possible matches */}
          {item.matches && item.matches.length > 0 && (
            <div className="mt-5">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><SearchIcon size={16} className="text-campus-primary" /> Possible matches</h3>
              <div className="grid grid-cols-2 gap-3">
                {item.matches.map((m: LostFoundItem) => {
                  const mMeta = lfCategoryMeta(m.category);
                  return (
                    <Link key={m.id} href={`/lost-found/${m.id}`} className="card overflow-hidden hover:scale-[1.01] transition-transform">
                      <div className="h-24 bg-gray-100 flex items-center justify-center">{m.photo ? <img src={m.photo} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl">{mMeta.emoji}</span>}</div>
                      <div className="p-2"><p className="font-medium text-xs truncate">{m.itemName}</p><p className="text-[10px] text-gray-400 truncate">{m.location}</p></div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Claim modal */}
        {showClaim && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-5 mb-16 lg:mb-0">
              <h3 className="font-bold text-lg mb-2">Prove it&apos;s yours</h3>
              {item.hasSecret ? (
                <p className="text-sm text-gray-600 mb-3">The reporter set a private question. Answer it so they can verify.{item.secretQuestion ? ` ${item.secretQuestion}` : ''}</p>
              ) : (
                <p className="text-sm text-gray-600 mb-3">Describe an identifying detail only the owner would know.</p>
              )}
              <textarea value={claimAnswer} onChange={(e) => setClaimAnswer(e.target.value)} placeholder="Your answer…" rows={3} className="input-field resize-none mb-3" />
              <div className="flex gap-2">
                <button onClick={() => setShowClaim(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button onClick={submitClaim} disabled={!claimAnswer.trim()} className="btn-primary flex-1 text-sm disabled:opacity-50">Send Claim</button>
              </div>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
