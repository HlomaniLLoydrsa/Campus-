'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { useFeedback } from '@/context/FeedbackContext';
import { serviceCategoryMeta, REQUEST_STATUS_LABEL } from '@/lib/services';
import { ArrowLeft, MapPin, Clock, Star, MessageCircle, Bookmark, Flag, Trash2, GraduationCap, CalendarCheck } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

export default function ServiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { currentUser, getUserById, reportContent } = useApp();
  const { confirm, toast } = useFeedback();
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reported, setReported] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [note, setNote] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');

  const load = async () => {
    try { const res = await fetch(`/api/services/${id}`); if (res.ok) { const d = await res.json(); setS(d); setReviewRating(d.myReview?.rating || 0); setReviewComment(d.myReview?.comment || ''); } } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const patch = async (body: any) => {
    const res = await fetch(`/api/services/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.ok ? res.json() : null;
  };

  if (loading) return <div className="flex min-h-screen"><Sidebar /><main className="flex-1"><TopBar /><div className="max-w-2xl mx-auto px-4 py-6"><div className="card h-64 animate-pulse bg-gray-100" /></div></main><BottomNav /></div>;
  if (!s) return <div className="flex min-h-screen"><Sidebar /><main className="flex-1"><TopBar /><div className="flex items-center justify-center h-96 text-gray-500">Not found</div></main><BottomNav /></div>;

  const provider = getUserById(s.providerId);
  const meta = serviceCategoryMeta(s.category);
  const isOwner = s.providerId === currentUser.id;

  const submitRequest = async () => {
    const d = await patch({ action: 'request', note: note.trim() });
    if (d?.success) { setShowRequest(false); load(); }
  };
  const submitReview = async () => {
    if (!reviewRating) return;
    const d = await patch({ action: 'review', rating: reviewRating, comment: reviewComment.trim() });
    if (d?.success) load();
  };
  const messageProvider = async () => {
    const d = await patch({ action: 'message' });
    if (d?.success) router.push('/messages');
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => router.push('/services')} className="flex items-center gap-1 text-sm text-campus-primary font-medium mb-4 hover:underline"><ArrowLeft size={14} /> Gigs &amp; Services</button>

          <div className="card p-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-campus-primary/10 flex items-center justify-center text-3xl flex-shrink-0">{s.kind === 'tutor' ? '🎓' : meta.emoji}</div>
              <div className="flex-1 min-w-0">
                <span className="badge-pill bg-campus-primary/10 text-campus-primary text-xs">{s.kind === 'tutor' ? 'Tutor' : meta.label}</span>
                <h1 className="font-bold text-lg mt-2">{s.name}</h1>
                {(s.ratingCount ?? 0) > 0 && <p className="text-sm text-gray-500 mt-1 flex items-center gap-1"><Star size={13} className="text-yellow-500 fill-yellow-500" /> {s.ratingAvg} ({s.ratingCount} review{s.ratingCount !== 1 ? 's' : ''})</p>}
              </div>
            </div>

            {s.kind === 'tutor' && s.subjects && <p className="text-sm text-campus-primary font-medium mt-3 flex items-center gap-1"><GraduationCap size={15} /> {s.subjects}</p>}
            {s.kind === 'tutor' && s.experience && <p className="text-xs text-gray-500 mt-1">Experience: {s.experience}</p>}
            {s.description && <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{s.description}</p>}

            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
              {s.rate && <span className="font-medium text-gray-700">{s.rate}</span>}
              {s.campus && <span className="flex items-center gap-1"><MapPin size={14} /> {s.campus}</span>}
              {s.availability && <span className="flex items-center gap-1"><Clock size={14} /> {s.availability}</span>}
            </div>

            {/* Portfolio */}
            {s.portfolio?.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {s.portfolio.map((src: string, i: number) => <div key={i} className="rounded-xl overflow-hidden aspect-square bg-gray-100"><img src={src} alt="" className="w-full h-full object-cover" /></div>)}
              </div>
            )}

            {provider && <Link href={`/profile/${provider.id}`} className="text-xs text-gray-500 mt-3 inline-block hover:text-campus-primary">Offered by {provider.name} · {formatTimeAgo(s.createdAt)}</Link>}

            {/* Actions */}
            <div className="mt-5 flex flex-wrap gap-2">
              {isOwner ? (
                <button onClick={async () => { const ok = await confirm({ title: 'Delete this listing?', confirmText: 'Delete', destructive: true }); if (ok) { await fetch(`/api/services/${id}`, { method: 'DELETE' }); toast('Listing deleted'); router.push('/services'); } }} className="px-3 py-2 rounded-xl border border-red-200 text-red-500 text-sm flex items-center gap-1"><Trash2 size={15} /> Delete</button>
              ) : s.myRequest ? (
                <span className="badge-pill bg-yellow-100 text-yellow-700 text-xs py-2 px-3">Request {REQUEST_STATUS_LABEL[s.myRequest.status]}</span>
              ) : (
                <>
                  <button onClick={() => setShowRequest(true)} className="btn-primary text-sm flex items-center gap-1"><CalendarCheck size={15} /> {s.kind === 'tutor' ? 'Request Session' : 'Request Service'}</button>
                  <button onClick={messageProvider} className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm flex items-center gap-1"><MessageCircle size={15} /> Message</button>
                  <button onClick={async () => { const d = await patch({ action: s.saved ? 'unsave' : 'save' }); if (d) setS({ ...s, saved: d.saved }); }} className={`p-2 rounded-xl border ${s.saved ? 'bg-campus-primary/10 border-campus-primary/30 text-campus-primary' : 'border-gray-200 text-gray-500'}`}><Bookmark size={18} fill={s.saved ? 'currentColor' : 'none'} /></button>
                  <button onClick={() => { reportContent('service', s.id, ''); setReported(true); }} disabled={reported} className="p-2 rounded-xl border border-gray-200 text-gray-500 disabled:opacity-50"><Flag size={18} /></button>
                </>
              )}
            </div>
          </div>

          {/* Provider: incoming requests */}
          {isOwner && s.requests?.length > 0 && (
            <div className="card p-4 mt-4">
              <p className="font-semibold text-sm mb-3">Requests ({s.requests.length})</p>
              <div className="space-y-3">
                {s.requests.map((rq: any) => {
                  const u = getUserById(rq.requesterId);
                  return (
                    <div key={rq.id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <Link href={`/profile/${rq.requesterId}`} className="text-sm font-medium hover:text-campus-primary">{u?.name || 'Someone'}</Link>
                        <span className={`badge-pill text-[10px] ${rq.status === 'accepted' ? 'bg-green-100 text-green-700' : rq.status === 'completed' ? 'bg-blue-100 text-blue-700' : rq.status === 'declined' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>{REQUEST_STATUS_LABEL[rq.status]}</span>
                      </div>
                      {rq.note && <p className="text-sm text-gray-600 mt-1 italic">&quot;{rq.note}&quot;</p>}
                      {rq.status === 'pending' && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={async () => { await patch({ action: 'respondRequest', requestId: rq.id, decision: 'accepted' }); load(); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white">Accept</button>
                          <button onClick={async () => { await patch({ action: 'respondRequest', requestId: rq.id, decision: 'declined' }); load(); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600">Decline</button>
                        </div>
                      )}
                      {rq.status === 'accepted' && (
                        <button onClick={async () => { await patch({ action: 'respondRequest', requestId: rq.id, decision: 'completed' }); load(); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white mt-2">Mark Completed</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reviews */}
          {!isOwner && (
            <div className="card p-4 mt-4">
              <p className="font-semibold text-sm mb-2">Leave a review</p>
              <div className="flex items-center gap-1 mb-2">
                {[1,2,3,4,5].map(n => <button key={n} onClick={() => setReviewRating(n)}><Star size={22} className={n <= reviewRating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'} /></button>)}
              </div>
              <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Share your experience (optional)" rows={2} className="input-field resize-none mb-2" />
              <button onClick={submitReview} disabled={!reviewRating} className="btn-primary text-sm disabled:opacity-50">{s.myReview ? 'Update review' : 'Post review'}</button>
            </div>
          )}
          {s.reviews?.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="font-semibold text-sm">Reviews</p>
              {s.reviews.map((rv: any) => {
                const u = getUserById(rv.userId);
                return (
                  <div key={rv.id} className="card p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{u?.name || 'Student'}</span>
                      <span className="flex items-center gap-0.5">{[1,2,3,4,5].map(n => <Star key={n} size={12} className={n <= rv.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'} />)}</span>
                    </div>
                    {rv.comment && <p className="text-sm text-gray-600 mt-1">{rv.comment}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showRequest && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-5 mb-16 lg:mb-0">
              <h3 className="font-bold text-lg mb-2">{s.kind === 'tutor' ? 'Request a session' : 'Request this service'}</h3>
              <p className="text-xs text-gray-500 mb-3">{provider?.name} will be notified and can accept.</p>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add details (what you need, when)…" rows={3} className="input-field resize-none mb-3" />
              <div className="flex gap-2">
                <button onClick={() => setShowRequest(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button onClick={submitRequest} className="btn-primary flex-1 text-sm">Send Request</button>
              </div>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
