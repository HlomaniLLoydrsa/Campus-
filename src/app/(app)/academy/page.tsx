'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { AcademyResource, RESOURCE_TYPES, typeMeta, formatFileSize } from '@/lib/academy';
import { BookOpen, Search, Plus, Download, Star, Bookmark, Clock, TrendingUp, X, Upload, Trash2 } from 'lucide-react';

type Tab = 'recent' | 'downloads' | 'rating' | 'saved';

export default function AcademyPage() {
  const { currentUser, getUserById } = useApp();
  const [tab, setTab] = useState<Tab>('recent');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [resources, setResources] = useState<AcademyResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const sort = tab === 'downloads' ? 'downloads' : tab === 'rating' ? 'rating' : 'recent';
    const params = new URLSearchParams();
    if (tab === 'saved') params.set('saved', '1'); else params.set('sort', sort);
    if (query.trim()) params.set('q', query.trim());
    if (typeFilter) params.set('type', typeFilter);
    try {
      const res = await fetch(`/api/academy?${params.toString()}`);
      if (res.ok) setResources(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [tab, query, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'recent', label: 'Recent', icon: Clock },
    { key: 'downloads', label: 'Most Downloaded', icon: Download },
    { key: 'rating', label: 'Top Rated', icon: Star },
    { key: 'saved', label: 'My Saved', icon: Bookmark },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold gradient-text flex items-center gap-2"><BookOpen className="text-campus-primary" /> VYBE Academy</h1>
              <p className="text-sm text-gray-500 mt-1">Past papers, notes &amp; study resources</p>
            </div>
            <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-2 text-sm flex-shrink-0"><Plus size={16} /> Upload</button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by module, course, title (e.g. COS301)" className="input-field pl-10" />
          </div>

          {/* Type chips */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-3 -mx-1 px-1">
            <button onClick={() => setTypeFilter('')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${!typeFilter ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>All</button>
            {RESOURCE_TYPES.map(t => (
              <button key={t.value} onClick={() => setTypeFilter(typeFilter === t.value ? '' : t.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${typeFilter === t.value ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-4 -mx-1 px-1">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap ${tab === t.key ? 'bg-campus-primary/10 text-campus-primary' : 'bg-gray-50 text-gray-500'}`}>
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>

          {/* Results */}
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <div key={i} className="card p-4 animate-pulse h-24 bg-gray-100" />)}
            </div>
          ) : resources.length === 0 ? (
            <div className="card p-8 text-center">
              <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">{tab === 'saved' ? 'No saved materials yet' : 'No resources found'}</p>
              <p className="text-sm text-gray-400 mt-1">{tab === 'saved' ? 'Bookmark resources to find them here.' : 'Be the first to share study material!'}</p>
              {tab !== 'saved' && <button onClick={() => setShowUpload(true)} className="btn-primary text-sm mt-4">Upload a resource</button>}
            </div>
          ) : (
            <div className="space-y-3">
              {resources.map(r => {
                const uploader = getUserById(r.uploaderId);
                const meta = typeMeta(r.type);
                return (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-campus-primary/10 flex items-center justify-center text-xl flex-shrink-0">{meta.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/academy/${r.id}`} className="font-semibold text-sm hover:text-campus-primary line-clamp-2">{r.title}</Link>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {[r.module, r.course, r.year && `Year ${r.year}`, r.semester && `Sem ${r.semester}`].filter(Boolean).join(' · ') || meta.label}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400 flex-wrap">
                          <span className="badge-pill bg-gray-100 text-gray-600 text-[10px]">{meta.label}</span>
                          <span className="flex items-center gap-1"><Download size={11} /> {r.downloads}</span>
                          {(r.ratingCount ?? 0) > 0 && <span className="flex items-center gap-1"><Star size={11} className="text-yellow-500 fill-yellow-500" /> {r.ratingAvg} ({r.ratingCount})</span>}
                          {r.fileType && <span className="uppercase">{r.fileType}{r.fileSize ? ` · ${formatFileSize(r.fileSize)}` : ''}</span>}
                        </div>
                        {uploader && (
                          <Link href={`/profile/${uploader.id}`} className="text-[11px] text-gray-400 mt-1 inline-block hover:text-campus-primary">by {uploader.name}</Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showUpload && <UploadModal onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); setTab('recent'); load(); }} />}
      </main>
      <BottomNav />
    </div>
  );
}

function UploadModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ title: '', type: 'past-paper', institution: '', faculty: '', course: '', module: '', year: '', semester: '', description: '' });
  const [file, setFile] = useState<File | null>(null);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setError('');
    if (!form.title.trim()) { setError('Give it a title'); return; }
    if (!file) { setError('Choose a file to upload'); return; }
    if (!ack) { setError('Please confirm you have the right to share this material'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const up = await fetch('/api/academy/upload', { method: 'POST', body: fd });
      if (!up.ok) { const d = await up.json().catch(() => ({})); setError(d.error || 'Upload failed'); setBusy(false); return; }
      const uploaded = await up.json();
      const res = await fetch('/api/academy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, fileUrl: uploaded.url, fileType: uploaded.fileType, fileSize: uploaded.fileSize }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Could not save'); setBusy(false); return; }
      onDone();
    } catch { setError('Something went wrong. Please try again.'); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 mb-16 lg:mb-0">
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-lg">Upload Study Material</h2><button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button></div>
        {error && <div className="p-3 mb-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">File</label>
            <label className="flex items-center gap-2 justify-center border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-campus-primary">
              <Upload size={18} className="text-gray-400" />
              <span className="text-sm text-gray-500 truncate">{file ? file.name : 'PDF, Word, PowerPoint, image… (max 25MB)'}</span>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,.odt,.csv,.zip,image/*" />
            </label>
          </div>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Title (e.g. COS301 June 2023 Exam)" className="input-field" />
          <select value={form.type} onChange={(e) => set('type', e.target.value)} className="input-field">
            {RESOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.course} onChange={(e) => set('course', e.target.value)} placeholder="Course" className="input-field" />
            <input value={form.module} onChange={(e) => set('module', e.target.value)} placeholder="Module (e.g. COS301)" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.year} onChange={(e) => set('year', e.target.value)} placeholder="Year (e.g. 2023)" className="input-field" />
            <input value={form.semester} onChange={(e) => set('semester', e.target.value)} placeholder="Semester (1/2)" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.institution} onChange={(e) => set('institution', e.target.value)} placeholder="Institution" className="input-field" />
            <input value={form.faculty} onChange={(e) => set('faculty', e.target.value)} placeholder="Faculty" className="input-field" />
          </div>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Description (optional)" rows={2} className="input-field resize-none" />
          <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 w-4 h-4 rounded flex-shrink-0" />
            <span>I confirm I have the right to share this material and it does not violate copyright (no full textbooks or unauthorized content).</span>
          </label>
          <button onClick={handleSubmit} disabled={busy} className="btn-primary w-full disabled:opacity-50">{busy ? 'Uploading…' : 'Upload Resource'}</button>
        </div>
      </div>
    </div>
  );
}
