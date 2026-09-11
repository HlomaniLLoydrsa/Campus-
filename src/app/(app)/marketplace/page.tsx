'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { MarketListing, MKT_CATEGORIES, CONDITIONS, mktCategoryMeta, formatPrice } from '@/lib/marketplace';
import { ShoppingBag, Search, Plus, X, Upload, Bookmark } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

type Tab = 'browse' | 'mine' | 'saved' | 'sold';

export default function MarketplacePage() {
  const [tab, setTab] = useState<Tab>('browse');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('recent');
  const [items, setItems] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (tab === 'mine') p.set('mine', '1');
    else if (tab === 'saved') p.set('saved', '1');
    else if (tab === 'sold') p.set('sold', '1');
    if (query.trim()) p.set('q', query.trim());
    if (category) p.set('category', category);
    p.set('sort', sort);
    try { const res = await fetch(`/api/marketplace?${p.toString()}`); if (res.ok) setItems(await res.json()); } catch {}
    setLoading(false);
  }, [tab, query, category, sort]);

  useEffect(() => { load(); }, [load]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'browse', label: 'Browse' },
    { key: 'mine', label: 'My Listings' },
    { key: 'saved', label: 'Saved' },
    { key: 'sold', label: 'Sold' },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold gradient-text flex items-center gap-2"><ShoppingBag className="text-campus-primary" /> Marketplace</h1>
              <p className="text-sm text-gray-500 mt-1">Buy &amp; sell with students</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm flex-shrink-0"><Plus size={16} /> Sell</button>
          </div>

          <div className="relative mb-3">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items…" className="input-field pl-10" />
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-2 -mx-1 px-1">
            <button onClick={() => setCategory('')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${!category ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>All</button>
            {MKT_CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setCategory(category === c.value ? '' : c.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${category === c.value ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>{c.emoji} {c.label}</button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap ${tab === t.key ? 'bg-campus-primary/10 text-campus-primary' : 'bg-gray-50 text-gray-500'}`}>{t.label}</button>
              ))}
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 flex-shrink-0 ml-2">
              <option value="recent">Newest</option>
              <option value="cheapest">Cheapest</option>
              <option value="priciest">Priciest</option>
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3">{[0,1,2,3].map(i => <div key={i} className="card h-48 animate-pulse bg-gray-100" />)}</div>
          ) : items.length === 0 ? (
            <div className="card p-8 text-center">
              <ShoppingBag size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">{tab === 'saved' ? 'No saved items' : tab === 'mine' ? 'You have no listings' : tab === 'sold' ? 'Nothing sold yet' : 'No items for sale yet'}</p>
              {(tab === 'browse' || tab === 'mine') && <button onClick={() => setShowCreate(true)} className="btn-primary text-sm mt-4">List an item</button>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {items.map(it => {
                const meta = mktCategoryMeta(it.category);
                return (
                  <Link key={it.id} href={`/marketplace/${it.id}`} className="card overflow-hidden hover:scale-[1.01] transition-transform">
                    <div className="h-32 bg-gray-100 flex items-center justify-center relative">
                      {it.images?.[0] ? <img src={it.images[0]} alt="" className="w-full h-full object-cover" /> : <span className="text-4xl">{meta.emoji}</span>}
                      {it.status === 'sold' && <span className="absolute top-2 left-2 badge-pill bg-gray-800 text-white text-[10px]">SOLD</span>}
                      {it.saved && <span className="absolute top-2 right-2 bg-white/90 rounded-full p-1"><Bookmark size={12} className="text-campus-primary fill-campus-primary" /></span>}
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-sm text-campus-primary">{formatPrice(it.price)}</p>
                      <p className="text-xs text-gray-700 truncate mt-0.5">{it.title}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatTimeAgo(it.createdAt)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {showCreate && <ListingModal onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); setTab('browse'); load(); }} />}
      </main>
      <BottomNav />
    </div>
  );
}

function ListingModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', price: '', category: 'other', condition: 'good', campus: '' });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list).slice(0, 6 - files.length);
    setFiles(prev => [...prev, ...arr]);
    setPreviews(prev => [...prev, ...arr.map(f => URL.createObjectURL(f))]);
  };

  const submit = async () => {
    setError('');
    if (!form.title.trim()) { setError('Give it a title'); return; }
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of files) {
        const fd = new FormData(); fd.append('file', f);
        const up = await fetch('/api/upload', { method: 'POST', body: fd });
        if (up.ok) urls.push((await up.json()).url);
      }
      const res = await fetch('/api/marketplace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, price: Number(form.price) || 0, images: urls }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Failed'); setBusy(false); return; }
      onDone();
    } catch { setError('Something went wrong.'); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 mb-16 lg:mb-0">
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-lg">List an Item</h2><button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button></div>
        {error && <div className="p-3 mb-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}
        <div className="space-y-3">
          {/* Photos */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden aspect-square bg-gray-100">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => { setFiles(f => f.filter((_, x) => x !== i)); setPreviews(p => p.filter((_, x) => x !== i)); }} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
          {files.length < 6 && (
            <label className="flex items-center gap-2 justify-center border-2 border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-campus-primary">
              <Upload size={18} className="text-gray-400" /><span className="text-sm text-gray-500">Add photos ({files.length}/6)</span>
              <input type="file" accept="image/*" multiple onChange={(e) => addFiles(e.target.files)} className="hidden" />
            </label>
          )}
          <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="What are you selling?" className="input-field" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.price} onChange={(e) => set('price', e.target.value)} type="number" placeholder="Price (R)" className="input-field" />
            <select value={form.condition} onChange={(e) => set('condition', e.target.value)} className="input-field">
              {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className="input-field">
            {MKT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
          </select>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Description" rows={3} className="input-field resize-none" />
          <input value={form.campus} onChange={(e) => set('campus', e.target.value)} placeholder="Campus / location" className="input-field" />
          <button onClick={submit} disabled={busy} className="btn-primary w-full disabled:opacity-50">{busy ? 'Posting…' : 'Post Listing'}</button>
        </div>
      </div>
    </div>
  );
}
