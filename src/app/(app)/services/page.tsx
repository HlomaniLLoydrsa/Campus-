'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { ServiceListing, SERVICE_CATEGORIES, serviceCategoryMeta, REQUEST_STATUS_LABEL } from '@/lib/services';
import { Briefcase, GraduationCap, Search, Plus, X, Upload, Star } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

type Tab = 'browse' | 'popular' | 'mine' | 'requests';

export default function ServicesPage() {
  return (
    <Suspense fallback={null}>
      <ServicesContent />
    </Suspense>
  );
}

function ServicesContent() {
  const { getUserById } = useApp();
  const searchParams = useSearchParams();
  const [kind, setKind] = useState<'service' | 'tutor'>(searchParams.get('kind') === 'tutor' ? 'tutor' : 'service');
  const [tab, setTab] = useState<Tab>('browse');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [items, setItems] = useState<ServiceListing[]>([]);
  const [reqs, setReqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'requests') {
        const res = await fetch('/api/services/requests?role=sent');
        if (res.ok) setReqs(await res.json());
      } else {
        const p = new URLSearchParams({ kind });
        if (tab === 'mine') p.set('mine', '1');
        p.set('sort', tab === 'popular' ? 'popular' : 'recent');
        if (query.trim()) p.set('q', query.trim());
        if (category) p.set('category', category);
        const res = await fetch(`/api/services?${p.toString()}`);
        if (res.ok) setItems(await res.json());
      }
    } catch {}
    setLoading(false);
  }, [kind, tab, query, category]);

  useEffect(() => { load(); }, [load]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'browse', label: 'Browse' },
    { key: 'popular', label: 'Popular' },
    { key: 'mine', label: 'My Services' },
    { key: 'requests', label: 'My Requests' },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold gradient-text flex items-center gap-2"><Briefcase className="text-campus-primary" /> Gigs &amp; Services</h1>
              <p className="text-sm text-gray-500 mt-1">Student services &amp; tutors</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm flex-shrink-0"><Plus size={16} /> Offer</button>
          </div>

          {/* Service / Tutor toggle */}
          <div className="flex gap-2 mb-3">
            <button onClick={() => setKind('service')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1 ${kind === 'service' ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}><Briefcase size={15} /> Services</button>
            <button onClick={() => setKind('tutor')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1 ${kind === 'tutor' ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}><GraduationCap size={15} /> Tutors</button>
          </div>

          <div className="relative mb-3">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={kind === 'tutor' ? 'Find tutors (e.g. COS301)' : 'Search services…'} className="input-field pl-10" />
          </div>

          {kind === 'service' && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-3 -mx-1 px-1">
              <button onClick={() => setCategory('')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${!category ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>All</button>
              {SERVICE_CATEGORIES.filter(c => c.value !== 'tutoring').map(c => (
                <button key={c.value} onClick={() => setCategory(category === c.value ? '' : c.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${category === c.value ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>{c.emoji} {c.label}</button>
              ))}
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-4 -mx-1 px-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap ${tab === t.key ? 'bg-campus-primary/10 text-campus-primary' : 'bg-gray-50 text-gray-500'}`}>{t.label}</button>
            ))}
          </div>

          {/* My Requests view */}
          {tab === 'requests' ? (
            loading ? <div className="space-y-3">{[0,1].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-100" />)}</div> :
            reqs.length === 0 ? <div className="card p-8 text-center"><Briefcase size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500 text-sm">You haven&apos;t requested anything yet</p></div> :
            <div className="space-y-3">
              {reqs.map(rq => (
                <Link key={rq.id} href={`/services/${rq.serviceId}`} className="card p-4 flex items-center justify-between">
                  <div className="min-w-0"><p className="font-semibold text-sm truncate">{rq.serviceName}</p><p className="text-xs text-gray-400 mt-0.5">{formatTimeAgo(rq.createdAt)}</p></div>
                  <span className={`badge-pill text-[10px] ${rq.status === 'accepted' ? 'bg-green-100 text-green-700' : rq.status === 'declined' || rq.status === 'cancelled' ? 'bg-gray-100 text-gray-500' : rq.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{REQUEST_STATUS_LABEL[rq.status]}</span>
                </Link>
              ))}
            </div>
          ) : loading ? (
            <div className="space-y-3">{[0,1,2].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}</div>
          ) : items.length === 0 ? (
            <div className="card p-8 text-center">
              {kind === 'tutor' ? <GraduationCap size={40} className="mx-auto text-gray-300 mb-3" /> : <Briefcase size={40} className="mx-auto text-gray-300 mb-3" />}
              <p className="text-gray-500 font-medium">{tab === 'mine' ? "You haven't offered anything yet" : `No ${kind === 'tutor' ? 'tutors' : 'services'} found`}</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary text-sm mt-4">{kind === 'tutor' ? 'Become a tutor' : 'Offer a service'}</button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(s => {
                const provider = getUserById(s.providerId);
                const meta = serviceCategoryMeta(s.category);
                return (
                  <Link key={s.id} href={`/services/${s.id}`} className="card p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-campus-primary/10 flex items-center justify-center text-xl flex-shrink-0">{s.kind === 'tutor' ? '🎓' : meta.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{s.name}</p>
                        {s.kind === 'tutor' && s.subjects && <p className="text-xs text-campus-primary truncate mt-0.5">{s.subjects}</p>}
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400 flex-wrap">
                          {s.rate && <span className="font-medium text-gray-600">{s.rate}</span>}
                          {(s.ratingCount ?? 0) > 0 && <span className="flex items-center gap-1"><Star size={11} className="text-yellow-500 fill-yellow-500" /> {s.ratingAvg} ({s.ratingCount})</span>}
                          {s.campus && <span>{s.campus}</span>}
                        </div>
                        {provider && <p className="text-[11px] text-gray-400 mt-1">by {provider.name}</p>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {showCreate && <CreateServiceModal defaultKind={kind} onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); setTab('mine'); load(); }} />}
      </main>
      <BottomNav />
    </div>
  );
}

function CreateServiceModal({ defaultKind, onClose, onDone }: { defaultKind: 'service' | 'tutor'; onClose: () => void; onDone: () => void }) {
  const [kind, setKind] = useState<'service' | 'tutor'>(defaultKind);
  const [form, setForm] = useState({ name: '', description: '', category: 'other', rate: '', campus: '', availability: '', subjects: '', experience: '' });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list).slice(0, 6 - files.length);
    setFiles(prev => [...prev, ...arr]); setPreviews(prev => [...prev, ...arr.map(f => URL.createObjectURL(f))]);
  };

  const submit = async () => {
    setError('');
    if (!form.name.trim()) { setError('Give it a name'); return; }
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of files) { const fd = new FormData(); fd.append('file', f); const up = await fetch('/api/upload', { method: 'POST', body: fd }); if (up.ok) urls.push((await up.json()).url); }
      const res = await fetch('/api/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, kind, portfolio: urls }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Failed'); setBusy(false); return; }
      onDone();
    } catch { setError('Something went wrong.'); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 mb-16 lg:mb-0">
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-lg">Offer {kind === 'tutor' ? 'Tutoring' : 'a Service'}</h2><button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button></div>
        {error && <div className="p-3 mb-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setKind('service')} className={`flex-1 py-2 rounded-xl text-sm font-medium ${kind === 'service' ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>Service</button>
            <button onClick={() => setKind('tutor')} className={`flex-1 py-2 rounded-xl text-sm font-medium ${kind === 'tutor' ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>Tutor</button>
          </div>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={kind === 'tutor' ? 'Tutor headline (e.g. Maths & Stats Tutor)' : 'Service name'} className="input-field" />
          {kind === 'service' && (
            <select value={form.category} onChange={(e) => set('category', e.target.value)} className="input-field">
              {SERVICE_CATEGORIES.filter(c => c.value !== 'tutoring').map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
            </select>
          )}
          {kind === 'tutor' && (
            <>
              <input value={form.subjects} onChange={(e) => set('subjects', e.target.value)} placeholder="Subjects/modules (e.g. COS301, MAT101)" className="input-field" />
              <input value={form.experience} onChange={(e) => set('experience', e.target.value)} placeholder="Experience (e.g. 2 years, distinction)" className="input-field" />
            </>
          )}
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe what you offer" rows={3} className="input-field resize-none" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.rate} onChange={(e) => set('rate', e.target.value)} placeholder="Rate (e.g. R150/hr)" className="input-field" />
            <input value={form.campus} onChange={(e) => set('campus', e.target.value)} placeholder="Campus" className="input-field" />
          </div>
          <input value={form.availability} onChange={(e) => set('availability', e.target.value)} placeholder="Availability (e.g. Weekends, evenings)" className="input-field" />
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((src, i) => <div key={i} className="relative rounded-xl overflow-hidden aspect-square bg-gray-100"><img src={src} alt="" className="w-full h-full object-cover" /><button onClick={() => { setFiles(f => f.filter((_, x) => x !== i)); setPreviews(p => p.filter((_, x) => x !== i)); }} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full"><X size={12} /></button></div>)}
            </div>
          )}
          {files.length < 6 && (
            <label className="flex items-center gap-2 justify-center border-2 border-dashed border-gray-200 rounded-xl p-3 cursor-pointer hover:border-campus-primary">
              <Upload size={18} className="text-gray-400" /><span className="text-sm text-gray-500">Portfolio photos ({files.length}/6, optional)</span>
              <input type="file" accept="image/*" multiple onChange={(e) => addFiles(e.target.files)} className="hidden" />
            </label>
          )}
          <button onClick={submit} disabled={busy} className="btn-primary w-full disabled:opacity-50">{busy ? 'Posting…' : 'Publish'}</button>
        </div>
      </div>
    </div>
  );
}
