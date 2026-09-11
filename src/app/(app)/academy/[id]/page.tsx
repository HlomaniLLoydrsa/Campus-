'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { AcademyResource, typeMeta, formatFileSize } from '@/lib/academy';
import { ArrowLeft, Download, Star, Bookmark, Flag, Trash2, BookOpen, CalendarPlus, X, Check } from 'lucide-react';

export default function AcademyResourcePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { currentUser, getUserById, reportContent } = useApp();
  const [r, setR] = useState<AcademyResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [reported, setReported] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/academy/${id}`);
      if (res.ok) setR(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const patch = async (body: any) => {
    const res = await fetch(`/api/academy/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.ok ? res.json() : null;
  };

  const handleDownload = async () => {
    if (!r) return;
    await patch({ action: 'download' });
    setR({ ...r, downloads: r.downloads + 1 });
    window.open(r.fileUrl, '_blank');
  };

  const toggleSave = async () => {
    if (!r) return;
    const d = await patch({ action: r.saved ? 'unsave' : 'save' });
    if (d) setR({ ...r, saved: d.saved });
  };

  const rate = async (val: number) => {
    if (!r) return;
    const d = await patch({ action: 'rate', rating: val });
    if (d) setR({ ...r, ratingAvg: d.ratingAvg, ratingCount: d.ratingCount, myRating: d.myRating });
  };

  const handleReport = () => {
    if (!r) return;
    reportContent('resource', r.id, '');
    setReported(true);
  };

  const handleDelete = async () => {
    if (!r || !confirm('Delete this resource? This cannot be undone.')) return;
    const res = await fetch(`/api/academy/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/academy');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen"><Sidebar /><main className="flex-1"><TopBar /><div className="max-w-2xl mx-auto px-4 py-6"><div className="card p-6 animate-pulse h-48 bg-gray-100" /></div></main><BottomNav /></div>
    );
  }
  if (!r) {
    return (
      <div className="flex min-h-screen"><Sidebar /><main className="flex-1"><TopBar /><div className="flex items-center justify-center h-96 text-gray-500">Resource not found</div></main><BottomNav /></div>
    );
  }

  const uploader = getUserById(r.uploaderId);
  const meta = typeMeta(r.type);
  const isOwner = r.uploaderId === currentUser.id;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => router.push('/academy')} className="flex items-center gap-1 text-sm text-campus-primary font-medium mb-4 hover:underline"><ArrowLeft size={14} /> Academy</button>

          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-campus-primary/10 flex items-center justify-center text-3xl flex-shrink-0">{meta.emoji}</div>
              <div className="flex-1 min-w-0">
                <span className="badge-pill bg-campus-primary/10 text-campus-primary text-xs">{meta.label}</span>
                <h1 className="font-bold text-lg mt-2 break-words">{r.title}</h1>
                <p className="text-sm text-gray-500 mt-1">{[r.module, r.course, r.year && `Year ${r.year}`, r.semester && `Sem ${r.semester}`].filter(Boolean).join(' · ')}</p>
              </div>
            </div>

            {r.description && <p className="text-sm text-gray-700 mt-4">{r.description}</p>}

            <div className="grid grid-cols-3 gap-3 mt-5 text-center">
              <div><p className="font-bold">{r.downloads}</p><p className="text-[11px] text-gray-500">Downloads</p></div>
              <div><p className="font-bold">{r.ratingAvg || '—'}</p><p className="text-[11px] text-gray-500">{(r.ratingCount ?? 0)} rating(s)</p></div>
              <div><p className="font-bold uppercase text-sm">{r.fileType || 'file'}</p><p className="text-[11px] text-gray-500">{formatFileSize(r.fileSize) || 'file'}</p></div>
            </div>

            {(r.institution || r.faculty) && (
              <p className="text-xs text-gray-400 mt-3">{[r.institution, r.faculty].filter(Boolean).join(' · ')}</p>
            )}
            {uploader && <Link href={`/profile/${uploader.id}`} className="text-xs text-gray-500 mt-1 inline-block hover:text-campus-primary">Uploaded by {uploader.name}</Link>}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-5">
              <button onClick={handleDownload} className="btn-primary flex-1 flex items-center justify-center gap-2"><Download size={16} /> Download</button>
              <button onClick={toggleSave} className={`p-3 rounded-xl border ${r.saved ? 'bg-campus-primary/10 border-campus-primary/30 text-campus-primary' : 'border-gray-200 text-gray-500'}`}><Bookmark size={18} fill={r.saved ? 'currentColor' : 'none'} /></button>
              {isOwner ? (
                <button onClick={handleDelete} className="p-3 rounded-xl border border-red-200 text-red-500 hover:bg-red-50"><Trash2 size={18} /></button>
              ) : (
                <button onClick={handleReport} disabled={reported} className="p-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50" title="Report"><Flag size={18} /></button>
              )}
            </div>
            {reported && <p className="text-xs text-green-600 mt-2 text-center">Reported. Thanks for keeping VYBE safe.</p>}

            <button onClick={() => setShowPlanner(true)} className="btn-secondary w-full mt-2 flex items-center justify-center gap-2"><CalendarPlus size={16} /> Add to Planner</button>

            {/* Rating */}
            {!isOwner && (
              <div className="mt-5 pt-4 border-t border-gray-100 text-center">
                <p className="text-sm font-medium text-gray-600 mb-2">Was this helpful? Rate it</p>
                <div className="flex items-center justify-center gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => rate(n)} className="p-1">
                      <Star size={24} className={n <= (r.myRating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'} />
                    </button>
                  ))}
                </div>
                {r.myRating ? <p className="text-xs text-gray-400 mt-1">You rated {r.myRating}/5</p> : null}
              </div>
            )}
          </div>
        </div>

        {showPlanner && <AddToPlannerModal resource={r} onClose={() => setShowPlanner(false)} />}
      </main>
      <BottomNav />
    </div>
  );
}

function AddToPlannerModal({ resource, onClose }: { resource: AcademyResource; onClose: () => void }) {
  const router = useRouter();
  const [as, setAs] = useState<'task' | 'session'>('task');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('16:00');
  const [durationMin, setDurationMin] = useState('60');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true); setError('');
    const body: any = { resourceId: resource.id, as };
    if (as === 'task') { body.dueDate = dueDate; body.dueTime = dueTime; }
    else { body.date = date; body.startTime = startTime; body.durationMin = Number(durationMin) || 60; }
    try {
      const res = await fetch('/api/planner/from-resource', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Could not add to planner.'); setBusy(false); return; }
      setDone(true);
      setTimeout(() => { router.push(d.kind === 'session' ? `/planner/study/${d.id}` : `/planner/tasks/${d.id}`); }, 700);
    } catch { setError('Something went wrong.'); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2"><CalendarPlus size={18} className="text-campus-primary" /> Add to Planner</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <p className="text-xs text-gray-500 mb-4 truncate">Linking &ldquo;{resource.title}&rdquo; — the resource stays in Academy, your planner just points to it.</p>

        {done ? (
          <div className="py-8 text-center"><Check size={40} className="mx-auto text-green-500 mb-2" /><p className="font-semibold text-gray-700">Added to your planner</p></div>
        ) : (
          <>
            {error && <div className="p-2.5 mb-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setAs('task')} className={`flex-1 py-2 rounded-xl text-sm font-medium border ${as === 'task' ? 'bg-campus-primary text-white border-campus-primary' : 'bg-white text-gray-600 border-gray-200'}`}>As a task</button>
              <button onClick={() => setAs('session')} className={`flex-1 py-2 rounded-xl text-sm font-medium border ${as === 'session' ? 'bg-campus-primary text-white border-campus-primary' : 'bg-white text-gray-600 border-gray-200'}`}>As a study session</button>
            </div>

            {as === 'task' ? (
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-gray-500 block mb-1">Due date (optional)</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Due time</label><input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="input-field" /></div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-gray-500 block mb-1">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" /></div>
                  <div><label className="text-xs text-gray-500 block mb-1">Start</label><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-field" /></div>
                </div>
                <div><label className="text-xs text-gray-500 block mb-1">Duration (min)</label><input type="number" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} className="input-field" /></div>
              </div>
            )}

            <button onClick={submit} disabled={busy} className="btn-primary w-full mt-4 disabled:opacity-50">{busy ? 'Adding…' : 'Add to Planner'}</button>
          </>
        )}
      </div>
    </div>
  );
}
