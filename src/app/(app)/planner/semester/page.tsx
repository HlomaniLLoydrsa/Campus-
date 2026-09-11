'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { ArrowLeft, GraduationCap, Layers, Plus, X } from 'lucide-react';

export default function MySemesterPage() {
  const [data, setData] = useState<any>(null);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    try {
      const [o, s] = await Promise.all([fetch('/api/planner/overview'), fetch('/api/planner/semesters')]);
      if (o.ok) setData(await o.json());
      if (s.ok) setSemesters(await s.json());
    } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const activate = async (id: string) => { await fetch(`/api/planner/semesters/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'activate' }) }); load(); };

  const toneClass = (tone: string) => tone === 'full' ? 'text-amber-700 bg-amber-50' : tone === 'steady' ? 'text-blue-700 bg-blue-50' : 'text-teal-700 bg-teal-50';

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Link href="/planner" className="p-1 rounded-lg hover:bg-gray-100"><ArrowLeft size={18} /></Link>
              <h1 className="text-xl font-bold flex items-center gap-2"><GraduationCap className="text-campus-primary" size={22} /> My Semester</h1>
            </div>
            <button onClick={() => setShowNew(true)} className="btn-secondary text-sm flex items-center gap-1"><Plus size={15} /> Semester</button>
          </div>
          <p className="text-sm text-gray-500 mb-4 ml-8">A calm overview of how your semester is going.</p>

          {loading ? (
            <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}</div>
          ) : !data ? (
            <div className="card p-8 text-center text-gray-500">Could not load your semester.</div>
          ) : (
            <>
              {/* Semester selector */}
              {semesters.length > 0 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-3">
                  {semesters.map(s => (
                    <button key={s.id} onClick={() => activate(s.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${s.active ? 'bg-campus-primary text-white border-campus-primary' : 'bg-white text-gray-600 border-gray-200'}`}>{s.name}</button>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="card p-5 mb-4">
                {data.semester ? (
                  <div className="mb-3">
                    <p className="font-bold">{data.semester.name}</p>
                    {(data.semester.startDate || data.semester.endDate) && <p className="text-xs text-gray-400">{[data.semester.startDate, data.semester.endDate].filter(Boolean).join(' → ')}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-3">No active semester set. You can still track modules and tasks.</p>
                )}

                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-500">Overall progress</span>
                  <span className="text-sm font-bold">{data.summary.overallProgress}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-campus-primary rounded-full transition-all" style={{ width: `${data.summary.overallProgress}%` }} />
                </div>
                <p className="text-[11px] text-gray-400">{data.summary.overallProgressLabel} · {data.summary.totalCompleted}/{data.summary.totalTasks} tasks done</p>

                <div className={`mt-4 p-3 rounded-xl text-sm font-medium ${toneClass(data.summary.workload.tone)}`}>
                  This week: {data.summary.workload.label}
                  <span className="text-xs font-normal opacity-80"> · {data.summary.weekHours}h of study planned</span>
                </div>
              </div>

              {/* Per-module progress */}
              <h2 className="font-bold text-sm mb-2 flex items-center gap-2"><Layers size={16} className="text-indigo-500" /> Modules</h2>
              {data.modules.length === 0 ? (
                <div className="card p-6 text-center text-sm text-gray-400">No modules yet. <Link href="/planner/modules" className="text-campus-primary">Add one</Link>.</div>
              ) : (
                <div className="space-y-2">
                  {data.modules.map((m: any) => (
                    <Link key={m.id} href={`/planner/modules/${m.id}`} className="card p-3 block hover:bg-gray-50">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                          <p className="text-sm font-medium truncate">{m.code || m.name}</p>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{m.progressLabel}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width: `${m.overall}%` }} />
                      </div>
                      <div className="flex gap-3 mt-1.5 text-[11px] text-gray-400">
                        <span>{m.completedTasks}/{m.taskCount} tasks</span>
                        {m.topicCount > 0 && <><span>·</span><span>{m.masteredTopics}/{m.topicCount} topics mastered</span></>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {showNew && <NewSemesterModal onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); load(); }} />}
      </main>
      <BottomNav />
    </div>
  );
}

function NewSemesterModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim()) { setError('Give your semester a name (e.g. Semester 2, 2026)'); return; }
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/planner/semesters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, startDate, endDate }) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || 'Failed'); setBusy(false); return; }
      onDone();
    } catch { setError('Something went wrong.'); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">New semester</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        {error && <div className="p-2.5 mb-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Semester 2, 2026" className="input-field mb-2" />
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-xs text-gray-500 block mb-1">Start</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">End</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" /></div>
        </div>
        <button onClick={submit} disabled={busy} className="btn-primary w-full mt-4 disabled:opacity-50">{busy ? 'Creating…' : 'Create & make active'}</button>
      </div>
    </div>
  );
}
