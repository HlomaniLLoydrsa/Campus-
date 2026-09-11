'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { PlannerModule } from '@/lib/planner';
import { ArrowLeft, Plus, X, Layers } from 'lucide-react';

const COLORS = ['#1A3F75', '#0EA5E9', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6'];

export default function PlannerModulesPage() {
  const [modules, setModules] = useState<(PlannerModule & { openTasks: number; topicCount: number; masteredTopics: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch('/api/planner/modules'); if (r.ok) setModules(await r.json()); } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Link href="/planner" className="p-1 rounded-lg hover:bg-gray-100"><ArrowLeft size={18} /></Link>
              <h1 className="text-xl font-bold flex items-center gap-2"><Layers className="text-campus-primary" size={22} /> Modules</h1>
            </div>
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Add</button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3">{[0,1].map(i => <div key={i} className="card h-28 animate-pulse bg-gray-100" />)}</div>
          ) : modules.length === 0 ? (
            <div className="card p-8 text-center">
              <Layers size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No modules added.</p>
              <p className="text-sm text-gray-400 mt-1">Add your current modules to get started.</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary text-sm mt-4">Add a module</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {modules.map(m => (
                <Link key={m.id} href={`/planner/modules/${m.id}`} className="card p-4 hover:scale-[1.01] transition-transform">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: m.color }}>{(m.code || m.name).slice(0, 3).toUpperCase()}</div>
                  <p className="font-semibold text-sm mt-2 truncate">{m.code || m.name}</p>
                  {m.code && <p className="text-[11px] text-gray-400 truncate">{m.name}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                    <span>{m.openTasks} tasks</span>
                    {m.topicCount > 0 && <span>{m.masteredTopics}/{m.topicCount} mastered</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {showCreate && <ModuleModal onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); load(); }} />}
      </main>
      <BottomNav />
    </div>
  );
}

function ModuleModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ code: '', name: '', color: COLORS[0] });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async () => {
    if (!form.name.trim()) { setError('Module name is required'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/planner/modules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Failed'); setBusy(false); return; }
      onDone();
    } catch { setError('Something went wrong.'); setBusy(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 mb-16 lg:mb-0">
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-lg">Add Module</h2><button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button></div>
        {error && <div className="p-3 mb-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}
        <div className="space-y-3">
          <input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} placeholder="Code (e.g. COS301)" className="input-field" />
          <input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Module name" className="input-field" />
          <div>
            <label className="text-xs text-gray-500 block mb-2">Colour</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))} className={`w-8 h-8 rounded-full border-2 ${form.color === c ? 'border-gray-800 scale-110' : 'border-white'}`} style={{ backgroundColor: c }} />)}
            </div>
          </div>
          <button onClick={submit} disabled={busy} className="btn-primary w-full disabled:opacity-50">{busy ? 'Adding…' : 'Add Module'}</button>
        </div>
      </div>
    </div>
  );
}
