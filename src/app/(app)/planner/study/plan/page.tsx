'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { PlannerModule, PlannerTopic, PlannerTask, countdown } from '@/lib/planner';
import { ArrowLeft, CalendarRange, Trash2, Wand2 } from 'lucide-react';

const WEEKDAYS = [
  { v: 1, label: 'Mon' }, { v: 2, label: 'Tue' }, { v: 3, label: 'Wed' },
  { v: 4, label: 'Thu' }, { v: 5, label: 'Fri' }, { v: 6, label: 'Sat' }, { v: 0, label: 'Sun' },
];

interface PreviewSession { date: string; startTime: string; endTime: string; durationMin: number; title: string; topicId: string | null; }

export default function StudyPlanBuilderPage() {
  return <Suspense fallback={null}><Builder /></Suspense>;
}

function Builder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modules, setModules] = useState<PlannerModule[]>([]);
  const [topics, setTopics] = useState<PlannerTopic[]>([]);
  const [exams, setExams] = useState<PlannerTask[]>([]);

  const [moduleId, setModuleId] = useState(searchParams.get('moduleId') || '');
  const [taskId, setTaskId] = useState(searchParams.get('taskId') || '');
  const [goal, setGoal] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('16:00');
  const [durationMin, setDurationMin] = useState('60');
  const [maxSessions, setMaxSessions] = useState('');
  const [useTopics, setUseTopics] = useState(true);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const [preview, setPreview] = useState<PreviewSession[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => { fetch('/api/planner/modules').then(r => r.ok ? r.json() : []).then(setModules).catch(() => {}); }, []);

  // When a module is picked, load its topics + exam/test tasks.
  useEffect(() => {
    if (!moduleId) { setTopics([]); setExams([]); return; }
    fetch(`/api/planner/topics?moduleId=${moduleId}`).then(r => r.ok ? r.json() : []).then((t) => { setTopics(t); setSelectedTopics(t.map((x: PlannerTopic) => x.id)); }).catch(() => {});
    fetch(`/api/planner/tasks?moduleId=${moduleId}`).then(r => r.ok ? r.json() : []).then((all: PlannerTask[]) => {
      setExams(all.filter(t => ['exam', 'test', 'quiz'].includes(t.type) && t.status !== 'completed'));
    }).catch(() => {});
  }, [moduleId]);

  // If an exam task is chosen, sync the target date from its due date.
  useEffect(() => {
    if (!taskId) return;
    const ex = exams.find(e => e.id === taskId);
    if (ex?.dueDate) setTargetDate(ex.dueDate);
    if (ex?.title) setGoal(`Prepare for ${ex.title}`);
  }, [taskId, exams]);

  const toggleWeekday = (v: number) => setWeekdays(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  const toggleTopic = (id: string) => setSelectedTopics(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const generate = async () => {
    setError(''); setInfo('');
    if (!targetDate) { setError('Pick a target date (your exam or deadline).'); return; }
    if (!weekdays.length) { setError('Select at least one available day.'); return; }
    setBusy(true);
    try {
      const chosenTopics = useTopics ? topics.filter(t => selectedTopics.includes(t.id)).map(t => ({ id: t.id, name: t.name })) : [];
      const res = await fetch('/api/planner/plans/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate, weekdays, startTime, durationMin: Number(durationMin) || 60, maxSessions: Number(maxSessions) || 0, topics: chosenTopics }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Could not generate a plan.'); setBusy(false); return; }
      setPreview(d.sessions);
      setInfo(`${d.generated} sessions across ${d.availableDays} available day${d.availableDays === 1 ? '' : 's'} before your target date.`);
    } catch { setError('Something went wrong.'); }
    setBusy(false);
  };

  const updateSession = (i: number, key: keyof PreviewSession, val: string) => {
    setPreview(p => p ? p.map((s, idx) => idx === i ? { ...s, [key]: key === 'durationMin' ? (Number(val) || 0) : val } : s) : p);
  };
  const removeSession = (i: number) => setPreview(p => p ? p.filter((_, idx) => idx !== i) : p);

  const save = async () => {
    if (!preview || !preview.length) { setError('Nothing to save — generate a plan first.'); return; }
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/planner/plans', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId: moduleId || null, taskId: taskId || null, goal, targetDate, sessions: preview }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Could not save the plan.'); setBusy(false); return; }
      router.push('/planner/calendar');
    } catch { setError('Something went wrong.'); setBusy(false); }
  };

  const cd = targetDate ? countdown(targetDate) : null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-campus-primary font-medium mb-4 hover:underline"><ArrowLeft size={14} /> Back</button>
          <h1 className="text-xl font-bold flex items-center gap-2 mb-1"><CalendarRange className="text-campus-primary" size={22} /> Study Plan Builder</h1>
          <p className="text-sm text-gray-500 mb-4">Spread your study sessions across the days you&apos;re free before a deadline.</p>

          {error && <div className="p-3 mb-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}
          {info && <div className="p-3 mb-3 bg-teal-50 border border-teal-100 rounded-xl text-sm text-teal-700">{info}</div>}

          <div className="card p-5 space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Module</label>
              <select value={moduleId} onChange={(e) => { setModuleId(e.target.value); setTaskId(''); }} className="input-field">
                <option value="">No module</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.code || m.name}</option>)}
              </select>
            </div>

            {exams.length > 0 && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Prepare for (optional)</label>
                <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="input-field">
                  <option value="">Not tied to a specific exam</option>
                  {exams.map(e => <option key={e.id} value={e.id}>{e.title}{e.dueDate ? ` · ${e.dueDate}` : ''}</option>)}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Target date</label>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Start time</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-field" />
              </div>
            </div>
            {cd && <p className={`text-xs ${cd.overdue ? 'text-red-600' : cd.soon ? 'text-orange-600' : 'text-gray-500'}`}>{cd.label}</p>}

            <div>
              <label className="text-xs text-gray-500 block mb-2">Available days</label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map(d => (
                  <button key={d.v} type="button" onClick={() => toggleWeekday(d.v)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${weekdays.includes(d.v) ? 'bg-campus-primary text-white border-campus-primary' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Session length (min)</label>
                <input type="number" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Max sessions (optional)</label>
                <input type="number" value={maxSessions} onChange={(e) => setMaxSessions(e.target.value)} placeholder="No limit" className="input-field" />
              </div>
            </div>

            {topics.length > 0 && (
              <div>
                <label className="flex items-center gap-2 text-sm mb-2">
                  <input type="checkbox" checked={useTopics} onChange={(e) => setUseTopics(e.target.checked)} />
                  Rotate through my topics
                </label>
                {useTopics && (
                  <div className="flex flex-wrap gap-2">
                    {topics.map(t => (
                      <button key={t.id} type="button" onClick={() => toggleTopic(t.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${selectedTopics.includes(t.id) ? 'bg-teal-100 text-teal-700 border-teal-200' : 'bg-white text-gray-500 border-gray-200'}`}>
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button onClick={generate} disabled={busy} className="btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-50">
              <Wand2 size={16} /> {busy && !preview ? 'Generating…' : 'Generate plan'}
            </button>
          </div>

          {preview && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold">Proposed sessions ({preview.length})</h2>
                <span className="text-xs text-gray-400">Edit or remove before saving</span>
              </div>
              {preview.length === 0 && <p className="text-sm text-gray-500">No sessions left. Adjust your settings and generate again.</p>}
              <div className="space-y-2">
                {preview.map((s, i) => (
                  <div key={i} className="card p-3 flex items-center gap-2">
                    <input type="date" value={s.date} onChange={(e) => updateSession(i, 'date', e.target.value)} className="input-field !py-1.5 text-sm flex-1 min-w-0" />
                    <input type="time" value={s.startTime} onChange={(e) => updateSession(i, 'startTime', e.target.value)} className="input-field !py-1.5 text-sm w-24" />
                    <input type="number" value={s.durationMin} onChange={(e) => updateSession(i, 'durationMin', e.target.value)} className="input-field !py-1.5 text-sm w-16" />
                    <button onClick={() => removeSession(i)} className="text-gray-400 hover:text-red-500 shrink-0" aria-label="Remove"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              {preview.length > 0 && (
                <button onClick={save} disabled={busy} className="btn-primary w-full mt-4 disabled:opacity-50">{busy ? 'Saving…' : `Save ${preview.length} sessions to my calendar`}</button>
              )}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
