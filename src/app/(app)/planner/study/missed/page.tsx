'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { ArrowLeft, History, Check, SkipForward, Sparkles } from 'lucide-react';

interface MissedRow {
  id: string; title: string; date: string; startTime: string; durationMin: number;
  module: { code?: string; name?: string } | null; suggestedDate: string;
  // local decision state
  decision: 'reschedule' | 'skip' | 'none';
  newDate: string; newTime: string;
}

export default function MissedSessionsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<MissedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/planner/sessions/missed');
      const d = r.ok ? await r.json() : { sessions: [] };
      setRows((d.sessions || []).map((s: any) => ({
        ...s, decision: 'none', newDate: s.suggestedDate, newTime: s.startTime || '16:00',
      })));
    } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const update = (id: string, patch: Partial<MissedRow>) => setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));
  const acceptAll = () => setRows(rs => rs.map(r => ({ ...r, decision: 'reschedule', newDate: r.suggestedDate })));

  const apply = async () => {
    const actions = rows.filter(r => r.decision !== 'none').map(r =>
      r.decision === 'skip' ? { id: r.id, action: 'skip' } : { id: r.id, action: 'reschedule', date: r.newDate, startTime: r.newTime }
    );
    if (!actions.length) { setError('Choose what to do with at least one session.'); return; }
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/planner/sessions/missed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actions }) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || 'Could not apply changes.'); setBusy(false); return; }
      router.push('/planner/calendar');
    } catch { setError('Something went wrong.'); setBusy(false); }
  };

  const pending = rows.filter(r => r.decision !== 'none').length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/planner/calendar" className="p-1 rounded-lg hover:bg-gray-100"><ArrowLeft size={18} /></Link>
            <h1 className="text-xl font-bold flex items-center gap-2"><History className="text-campus-primary" size={22} /> Catch up</h1>
          </div>
          <p className="text-sm text-gray-500 mb-4 ml-8">Study sessions that slipped past their date. Reschedule the ones you still want.</p>

          {error && <div className="p-3 mb-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}

          {loading ? (
            <div className="space-y-3">{[0, 1].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}</div>
          ) : rows.length === 0 ? (
            <div className="card p-8 text-center">
              <Check size={40} className="mx-auto text-green-400 mb-3" />
              <p className="font-semibold text-gray-700">You&apos;re all caught up</p>
              <p className="text-sm text-gray-400 mt-1">No missed study sessions.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{rows.length} missed session{rows.length === 1 ? '' : 's'}</span>
                <button onClick={acceptAll} className="text-xs font-medium text-campus-primary flex items-center gap-1"><Sparkles size={13} /> Accept all suggestions</button>
              </div>

              <div className="space-y-3">
                {rows.map(r => (
                  <div key={r.id} className={`card p-4 ${r.decision === 'skip' ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{r.title}</p>
                        <p className="text-[11px] text-gray-400">{r.module ? `${r.module.code || r.module.name} · ` : ''}was {r.date}{r.startTime ? ` ${r.startTime}` : ''} · {r.durationMin}min</p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button onClick={() => update(r.id, { decision: 'reschedule', newDate: r.decision === 'reschedule' ? r.newDate : r.suggestedDate })}
                        className={`flex-1 text-xs py-1.5 rounded-lg font-medium border ${r.decision === 'reschedule' ? 'bg-campus-primary text-white border-campus-primary' : 'bg-white text-gray-600 border-gray-200'}`}>
                        Reschedule
                      </button>
                      <button onClick={() => update(r.id, { decision: 'skip' })}
                        className={`flex-1 text-xs py-1.5 rounded-lg font-medium border flex items-center justify-center gap-1 ${r.decision === 'skip' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-600 border-gray-200'}`}>
                        <SkipForward size={12} /> Skip
                      </button>
                    </div>

                    {r.decision === 'reschedule' && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <input type="date" value={r.newDate} onChange={(e) => update(r.id, { newDate: e.target.value })} className="input-field !py-2 text-sm" />
                        <input type="time" value={r.newTime} onChange={(e) => update(r.id, { newTime: e.target.value })} className="input-field !py-2 text-sm" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={apply} disabled={busy || pending === 0} className="btn-primary w-full mt-4 disabled:opacity-50">
                {busy ? 'Applying…' : pending === 0 ? 'Choose an action above' : `Apply to ${pending} session${pending === 1 ? '' : 's'}`}
              </button>
            </>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
