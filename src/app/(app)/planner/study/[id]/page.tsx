'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { ArrowLeft, Play, Pause, CheckCircle2, X, Trash2 } from 'lucide-react';

export default function StudyModePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [showComplete, setShowComplete] = useState(false);
  const [reflection, setReflection] = useState('');
  const timer = useRef<any>(null);

  const load = useCallback(async () => {
    try { const r = await fetch(`/api/planner/sessions/${id}`); if (r.ok) setS(await r.json()); } catch {}
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (running) { timer.current = setInterval(() => setElapsed(e => e + 1), 1000); }
    else if (timer.current) { clearInterval(timer.current); }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [running]);

  const finish = async (status: 'completed' | 'partial') => {
    const actualMin = Math.round(elapsed / 60);
    await fetch(`/api/planner/sessions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: status, actualMin, reflection: reflection.trim() }) });
    router.push('/planner');
  };

  if (loading) return <div className="flex min-h-screen"><Sidebar /><main className="flex-1"><TopBar /><div className="max-w-2xl mx-auto px-4 py-6"><div className="card h-64 animate-pulse bg-gray-100" /></div></main><BottomNav /></div>;
  if (!s) return <div className="flex min-h-screen"><Sidebar /><main className="flex-1"><TopBar /><div className="flex items-center justify-center h-96 text-gray-500">Session not found</div></main><BottomNav /></div>;

  const done = s.status === 'completed' || s.status === 'partial';
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => router.push('/planner')} className="flex items-center gap-1 text-sm text-campus-primary font-medium hover:underline"><ArrowLeft size={14} /> Planner</button>
            {!done && <button onClick={async () => { if (confirm('Delete this session?')) { await fetch(`/api/planner/sessions/${id}`, { method: 'DELETE' }); router.push('/planner'); } }} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>}
          </div>

          {done ? (
            <div className="card p-8 text-center">
              <CheckCircle2 size={40} className="mx-auto text-green-500 mb-3" />
              <p className="font-semibold">{s.title}</p>
              <p className="text-sm text-gray-500 mt-1">Session {s.status}{s.actualMin ? ` · ${s.actualMin} min studied` : ''}</p>
              {s.reflection && <p className="text-sm text-gray-600 mt-3 italic">&quot;{s.reflection}&quot;</p>}
            </div>
          ) : (
            <div className="card p-6 text-center">
              <p className="text-xs font-semibold text-campus-primary uppercase tracking-wide">Study session</p>
              <h1 className="font-bold text-lg mt-1">{s.title}</h1>
              {s.goal && <p className="text-sm text-gray-500 mt-1">🎯 {s.goal}</p>}
              <p className="text-xs text-gray-400 mt-1">Planned: {s.durationMin} min</p>

              <div className="my-8">
                <p className="text-6xl font-bold tabular-nums tracking-tight">{mm}:{ss}</p>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setRunning(r => !r)} className="btn-primary flex items-center gap-2 px-6">
                  {running ? <><Pause size={18} /> Pause</> : <><Play size={18} /> {elapsed > 0 ? 'Resume' : 'Start'}</>}
                </button>
                <button onClick={() => { setRunning(false); setShowComplete(true); }} className="btn-secondary flex items-center gap-2"><CheckCircle2 size={18} /> Finish</button>
              </div>
            </div>
          )}
        </div>

        {showComplete && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-5 mb-16 lg:mb-0">
              <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-lg">How did it go?</h3><button onClick={() => setShowComplete(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button></div>
              <p className="text-sm text-gray-500 mb-3">You studied {Math.round(elapsed / 60)} minute(s).</p>
              <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Quick reflection (optional)" rows={2} className="input-field resize-none mb-3" />
              <div className="flex flex-col gap-2">
                <button onClick={() => finish('completed')} className="btn-primary w-full">Completed 🎉</button>
                <button onClick={() => finish('partial')} className="btn-secondary w-full">Partially completed</button>
              </div>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
