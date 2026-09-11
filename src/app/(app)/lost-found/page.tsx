'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { LostFoundItem, LF_CATEGORIES, lfCategoryMeta } from '@/lib/lostfound';
import { Search, Plus, X, MapPin, Upload, Search as SearchIcon } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

export default function LostFoundPage() {
  const { getUserById } = useApp();
  const [kind, setKind] = useState<'lost' | 'found'>('lost');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ kind });
    if (query.trim()) p.set('q', query.trim());
    if (category) p.set('category', category);
    try { const res = await fetch(`/api/lost-found?${p.toString()}`); if (res.ok) setItems(await res.json()); } catch {}
    setLoading(false);
  }, [kind, query, category]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold gradient-text flex items-center gap-2"><SearchIcon className="text-campus-primary" /> Lost &amp; Found</h1>
              <p className="text-sm text-gray-500 mt-1">Reunite people with their things</p>
            </div>
            <button onClick={() => setShowReport(true)} className="btn-primary flex items-center gap-2 text-sm flex-shrink-0"><Plus size={16} /> Report</button>
          </div>

          {/* Lost / Found toggle */}
          <div className="flex gap-2 mb-3">
            <button onClick={() => setKind('lost')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${kind === 'lost' ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>Lost Items</button>
            <button onClick={() => setKind('found')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${kind === 'found' ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>Found Items</button>
          </div>

          <div className="relative mb-3">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items, location…" className="input-field pl-10" />
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-4 -mx-1 px-1">
            <button onClick={() => setCategory('')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${!category ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>All</button>
            {LF_CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setCategory(category === c.value ? '' : c.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${category === c.value ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>{c.emoji} {c.label}</button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3">{[0,1,2,3].map(i => <div key={i} className="card h-40 animate-pulse bg-gray-100" />)}</div>
          ) : items.length === 0 ? (
            <div className="card p-8 text-center">
              <SearchIcon size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No {kind} items {category ? 'in this category' : 'yet'}</p>
              <button onClick={() => setShowReport(true)} className="btn-primary text-sm mt-4">Report {kind === 'lost' ? 'a lost' : 'a found'} item</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {items.map(it => {
                const meta = lfCategoryMeta(it.category);
                return (
                  <Link key={it.id} href={`/lost-found/${it.id}`} className="card overflow-hidden hover:scale-[1.01] transition-transform">
                    <div className="h-28 bg-gray-100 flex items-center justify-center relative">
                      {it.photo ? <img src={it.photo} alt="" className="w-full h-full object-cover" /> : <span className="text-4xl">{meta.emoji}</span>}
                      {it.status === 'recovered' && <span className="absolute top-2 left-2 badge-pill bg-green-100 text-green-700 text-[10px]">Recovered</span>}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-sm truncate">{it.itemName}</p>
                      <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5"><MapPin size={10} /> {it.location || meta.label}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatTimeAgo(it.createdAt)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {showReport && <ReportModal defaultKind={kind} onClose={() => setShowReport(false)} onDone={() => { setShowReport(false); load(); }} />}
      </main>
      <BottomNav />
    </div>
  );
}

function ReportModal({ defaultKind, onClose, onDone }: { defaultKind: 'lost' | 'found'; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ kind: defaultKind, itemName: '', category: 'other', description: '', location: '', campus: '', dateOn: '', secretQuestion: '' });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.itemName.trim()) { setError('What is the item?'); return; }
    setBusy(true);
    try {
      let photo: string | undefined;
      if (file) {
        const fd = new FormData(); fd.append('file', file);
        const up = await fetch('/api/upload', { method: 'POST', body: fd });
        if (up.ok) photo = (await up.json()).url;
      }
      const res = await fetch('/api/lost-found', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, photo }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Failed'); setBusy(false); return; }
      const created = await res.json();
      onDone();
      if (created.matchCount > 0) alert(`We found ${created.matchCount} possible match(es)! Check the item page.`);
    } catch { setError('Something went wrong.'); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 mb-16 lg:mb-0">
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-lg">Report an Item</h2><button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button></div>
        {error && <div className="p-3 mb-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => set('kind', 'lost')} className={`flex-1 py-2 rounded-xl text-sm font-medium ${form.kind === 'lost' ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>I lost this</button>
            <button onClick={() => set('kind', 'found')} className={`flex-1 py-2 rounded-xl text-sm font-medium ${form.kind === 'found' ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>I found this</button>
          </div>
          <label className="flex items-center gap-2 justify-center border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-campus-primary">
            <Upload size={18} className="text-gray-400" />
            <span className="text-sm text-gray-500 truncate">{file ? file.name : 'Add a photo (optional)'}</span>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
          </label>
          <input value={form.itemName} onChange={(e) => set('itemName', e.target.value)} placeholder="Item (e.g. Black HP laptop)" className="input-field" />
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className="input-field">
            {LF_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
          </select>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Description" rows={2} className="input-field resize-none" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Location" className="input-field" />
            <input value={form.campus} onChange={(e) => set('campus', e.target.value)} placeholder="Campus" className="input-field" />
          </div>
          <input value={form.dateOn} onChange={(e) => set('dateOn', e.target.value)} placeholder={`Date ${form.kind}`} className="input-field" />
          {form.kind === 'found' && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Ownership question (private)</label>
              <input value={form.secretQuestion} onChange={(e) => set('secretQuestion', e.target.value)} placeholder="e.g. What's the lock-screen wallpaper?" className="input-field" />
              <p className="text-[11px] text-gray-400 mt-1">Only you see this. Claimants must answer it to prove the item is theirs.</p>
            </div>
          )}
          <button onClick={submit} disabled={busy} className="btn-primary w-full disabled:opacity-50">{busy ? 'Posting…' : 'Post Report'}</button>
        </div>
      </div>
    </div>
  );
}
