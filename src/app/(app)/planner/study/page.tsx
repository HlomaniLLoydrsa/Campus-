'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { PlannerModule } from '@/lib/planner';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function NewStudySessionPage() {
  return <Suspense fallback={null}><NewSessionContent /></Suspense>;
}

function NewSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modules, setModules] = useState<PlannerModule[]>([]);
  const [form, setForm] = useState({
    title: '', moduleId: searchParams.get('moduleId') || '', taskId: searchParams.get('taskId') || '',
    date: new Date().toISOString().slice(0, 10), startTime: '', durationMin: '60', goal: '',
  });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { fetch('/api/planner/modules').then(r => r.ok ? r.json() : []).then(setModules).catch(() => {}); }, []);

  const submit = async () => {
    setError('');
    if (!form.title.trim()) { setError('Give your session a title'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/planner/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, durationMin: Number(form.durationMin) || 60 }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Failed'); setBusy(false); return; }
      const s = await res.json();
      router.push(`/planner/study/${s.id}`);
    } catch { setError('Something went wrong.'); setBusy(false); }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-campus-primary font-medium mb-4 hover:underline"><ArrowLeft size={14} /> Back</button>
          <h1 className="text-xl font-bold flex items-center gap-2 mb-4"><BookOpen className="text-campus-primary" size={22} /> New Study Session</h1>
          {error && <div className="p-3 mb-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}
          <div className="card p-5 space-y-3">
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Session title (e.g. Database Revision)" className="input-field" />
            <select value={form.moduleId} onChange={(e) => set('moduleId', e.target.value)} className="input-field"><option value="">No module</option>{modules.map(m => <option key={m.id} value={m.id}>{m.code || m.name}</option>)}</select>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-gray-500 block mb-1">Date</label><input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className="input-field" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Start time</label><input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} className="input-field" /></div>
            </div>
            <div><label className="text-xs text-gray-500 block mb-1">Duration (minutes)</label><input type="number" value={form.durationMin} onChange={(e) => set('durationMin', e.target.value)} className="input-field" /></div>
            <textarea value={form.goal} onChange={(e) => set('goal', e.target.value)} placeholder="Goal (e.g. Understand normalization)" rows={2} className="input-field resize-none" />
            <button onClick={submit} disabled={busy} className="btn-primary w-full disabled:opacity-50">{busy ? 'Creating…' : 'Create session'}</button>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
