'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { useFeedback } from '@/context/FeedbackContext';
import { MarketListing, mktCategoryMeta, conditionLabel, formatPrice } from '@/lib/marketplace';
import { ArrowLeft, MapPin, MessageCircle, Bookmark, Flag, Trash2, Tag, CheckCircle, RotateCcw } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

export default function ListingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { currentUser, getUserById, reportContent } = useApp();
  const { confirm, toast } = useFeedback();
  const [it, setIt] = useState<MarketListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [reported, setReported] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [messaging, setMessaging] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [msgSent, setMsgSent] = useState(false);

  const load = async () => {
    try { const res = await fetch(`/api/marketplace/${id}`); if (res.ok) setIt(await res.json()); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const patch = async (body: any) => {
    const res = await fetch(`/api/marketplace/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.ok ? res.json() : null;
  };

  if (loading) return <div className="flex min-h-screen"><Sidebar /><main className="flex-1"><TopBar /><div className="max-w-2xl mx-auto px-4 py-6"><div className="card h-72 animate-pulse bg-gray-100" /></div></main><BottomNav /></div>;
  if (!it) return <div className="flex min-h-screen"><Sidebar /><main className="flex-1"><TopBar /><div className="flex items-center justify-center h-96 text-gray-500">Listing not found</div></main><BottomNav /></div>;

  const meta = mktCategoryMeta(it.category);
  const seller = getUserById(it.sellerId);
  const isOwner = it.sellerId === currentUser.id;

  const sendMessage = async () => {
    const d = await patch({ action: 'message', text: msgText.trim() || undefined });
    if (d?.success) { setMsgSent(true); setMessaging(false); setTimeout(() => router.push('/messages'), 900); }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => router.push('/marketplace')} className="flex items-center gap-1 text-sm text-campus-primary font-medium mb-4 hover:underline"><ArrowLeft size={14} /> Marketplace</button>

          <div className="card overflow-hidden">
            {/* Image */}
            <div className="h-64 bg-gray-100 flex items-center justify-center relative">
              {it.images?.length ? <img src={it.images[imgIdx]} alt="" className="w-full h-full object-contain" /> : <span className="text-6xl">{meta.emoji}</span>}
              {it.status === 'sold' && <span className="absolute top-3 left-3 badge-pill bg-gray-800 text-white text-xs">SOLD</span>}
            </div>
            {it.images && it.images.length > 1 && (
              <div className="flex gap-2 p-2 overflow-x-auto scrollbar-hide">
                {it.images.map((src, i) => (
                  <button key={i} onClick={() => setImgIdx(i)} className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 ${i === imgIdx ? 'border-campus-primary' : 'border-transparent'}`}><img src={src} alt="" className="w-full h-full object-cover" /></button>
                ))}
              </div>
            )}

            <div className="p-5">
              <p className="text-2xl font-bold text-campus-primary">{formatPrice(it.price)}</p>
              <h1 className="font-bold text-lg mt-1">{it.title}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="badge-pill bg-gray-100 text-gray-600 text-xs">{meta.emoji} {meta.label}</span>
                <span className="badge-pill bg-gray-100 text-gray-600 text-xs"><Tag size={11} className="inline mr-1" />{conditionLabel(it.condition)}</span>
                {it.campus && <span className="badge-pill bg-gray-100 text-gray-600 text-xs"><MapPin size={11} className="inline mr-1" />{it.campus}</span>}
              </div>
              {it.description && <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{it.description}</p>}
              {seller && <Link href={`/profile/${seller.id}`} className="text-xs text-gray-500 mt-3 inline-block hover:text-campus-primary">Sold by {seller.name} · {formatTimeAgo(it.createdAt)}</Link>}

              {/* Actions */}
              <div className="mt-5 flex flex-wrap gap-2">
                {isOwner ? (
                  <>
                    {it.status === 'available' ? (
                      <button onClick={async () => { const d = await patch({ action: 'markSold' }); if (d) setIt({ ...it, status: 'sold' }); }} className="btn-primary text-sm flex items-center gap-1"><CheckCircle size={15} /> Mark Sold</button>
                    ) : (
                      <button onClick={async () => { const d = await patch({ action: 'relist' }); if (d) setIt({ ...it, status: 'available' }); }} className="btn-secondary text-sm flex items-center gap-1"><RotateCcw size={15} /> Relist</button>
                    )}
                    <button onClick={async () => { const ok = await confirm({ title: 'Delete this listing?', confirmText: 'Delete', destructive: true }); if (ok) { await fetch(`/api/marketplace/${id}`, { method: 'DELETE' }); toast('Listing deleted'); router.push('/marketplace'); } }} className="px-3 py-2 rounded-xl border border-red-200 text-red-500 text-sm flex items-center gap-1"><Trash2 size={15} /> Delete</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setMessaging(true)} disabled={msgSent} className="btn-primary text-sm flex items-center gap-1 disabled:opacity-50"><MessageCircle size={15} /> {msgSent ? 'Message sent' : 'Message Seller'}</button>
                    <button onClick={async () => { const d = await patch({ action: it.saved ? 'unsave' : 'save' }); if (d) setIt({ ...it, saved: d.saved }); }} className={`p-2 rounded-xl border ${it.saved ? 'bg-campus-primary/10 border-campus-primary/30 text-campus-primary' : 'border-gray-200 text-gray-500'}`}><Bookmark size={18} fill={it.saved ? 'currentColor' : 'none'} /></button>
                    <button onClick={() => { reportContent('listing', it.id, ''); setReported(true); }} disabled={reported} className="p-2 rounded-xl border border-gray-200 text-gray-500 disabled:opacity-50"><Flag size={18} /></button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {messaging && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-5 mb-16 lg:mb-0">
              <h3 className="font-bold text-lg mb-2">Message {seller?.name?.split(' ')[0] || 'seller'}</h3>
              <p className="text-xs text-gray-500 mb-3">About &quot;{it.title}&quot;</p>
              <textarea value={msgText} onChange={(e) => setMsgText(e.target.value)} placeholder={`Is "${it.title}" still available?`} rows={3} className="input-field resize-none mb-3" />
              <div className="flex gap-2">
                <button onClick={() => setMessaging(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button onClick={sendMessage} className="btn-primary flex-1 text-sm">Send</button>
              </div>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
