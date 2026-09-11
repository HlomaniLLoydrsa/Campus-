'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { AcademyResource, typeMeta, formatFileSize } from '@/lib/academy';
import { ArrowLeft, Download, Star, Bookmark, Flag, Trash2, BookOpen } from 'lucide-react';

export default function AcademyResourcePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { currentUser, getUserById, reportContent } = useApp();
  const [r, setR] = useState<AcademyResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [reported, setReported] = useState(false);

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
      </main>
      <BottomNav />
    </div>
  );
}
