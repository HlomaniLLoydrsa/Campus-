'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { TOPIC_STATUSES, topicStatusMeta, taskTypeMeta, countdown } from '@/lib/planner';
import { ArrowLeft, Plus, X, Trash2, Archive } from 'lucide-react';

type Tab = 'overview' | 'tasks' | 'topics';

export default function ModuleWorkspacePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [m, setM] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [newTopic, setNewTopic] = useState('');

  const load = useCallback(async () => {
    try { const r = await fetch(`/api/planner/modules/${id}`); if (r.ok) setM(await r.json()); } catch {}
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const addTopic = async () => {
    if (!newTopic.trim()) return;
    await fetch('/api/planner/topics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ moduleId: id, name: newTopic.trim() }) });
    setNewTopic(''); load();
  };
  const cycleTopic = async (topic: any) => {
    const order = TOPIC_STATUSES.map(s => s.value);
    const next = order[(order.indexOf(topic.status) + 1) % order.length];
    await fetch('/api/planner/topics', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: topic.id, status: next }) });
    load();
  };
  const delTopic = async (topicId: string) => { await fetch(`/api/planner/topics?id=${topicId}`, { method: 'DELETE' }); load(); };

  if (loading) return <div className="flex min-h-screen"><Sidebar /><main className="flex-1"><TopBar /><div className="max-w-2xl mx-auto px-4 py-6"><div className="card h-48 animate-pulse bg-gray-100" /></div></main><BottomNav /></div>;
  if (!m) return <div className="flex min-h-screen"><Sidebar /><main className="flex-1"><TopBar /><div className="flex items-center justify-center h-96 text-gray-500">Module not found</div></main><BottomNav /></div>;

  const openTasks = (m.tasks || []).filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled');
  const topics = m.topics || [];
  const mastered = topics.filter((t: any) => t.status === 'mastered').length;
  const started = topics.filter((t: any) => t.status !== 'not-started').length;
  const nextAssessment = openTasks.filter((t: any) => t.dueDate).sort((a: any, b: any) => a.dueDate.localeCompare(b.dueDate))[0];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => router.push('/planner/modules')} className="flex items-center gap-1 text-sm text-campus-primary font-medium hover:underline"><ArrowLeft size={14} /> Modules</button>
            <div className="flex items-center gap-2">
              <button onClick={async () => { await fetch(`/api/planner/modules/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'archive' }) }); router.push('/planner/modules'); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Archive"><Archive size={16} /></button>
              <button onClick={async () => { if (confirm('Delete this module and its tasks/topics?')) { await fetch(`/api/planner/modules/${id}`, { method: 'DELETE' }); router.push('/planner/modules'); } }} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: m.color }}>{(m.code || m.name).slice(0, 3).toUpperCase()}</div>
              <div className="min-w-0"><h1 className="font-bold text-lg truncate">{m.code || m.name}</h1>{m.code && <p className="text-sm text-gray-500 truncate">{m.name}</p>}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 mb-4">
            {(['overview','tasks','topics'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-xl text-sm font-medium capitalize ${tab === t ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>{t}</button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="card p-3 text-center"><p className="text-xl font-bold">{openTasks.length}</p><p className="text-[11px] text-gray-500">open tasks</p></div>
                <div className="card p-3 text-center"><p className="text-xl font-bold">{started}/{topics.length}</p><p className="text-[11px] text-gray-500">topics started</p></div>
                <div className="card p-3 text-center"><p className="text-xl font-bold">{mastered}</p><p className="text-[11px] text-gray-500">mastered</p></div>
              </div>
              {nextAssessment && (
                <div className="card p-4 border-l-4 border-campus-primary">
                  <p className="text-[11px] font-semibold text-campus-primary uppercase mb-1">Next assessment</p>
                  <Link href={`/planner/tasks/${nextAssessment.id}`} className="font-semibold hover:text-campus-primary">{taskTypeMeta(nextAssessment.type).emoji} {nextAssessment.title}</Link>
                  <p className="text-xs text-gray-500 mt-0.5">{countdown(nextAssessment.dueDate, nextAssessment.dueTime).label}</p>
                </div>
              )}
              <Link href={`/planner/tasks?new=1`} className="btn-secondary text-sm inline-flex items-center gap-1"><Plus size={14} /> Add a task</Link>
            </div>
          )}

          {tab === 'tasks' && (
            (m.tasks || []).length === 0 ? <div className="card p-6 text-center text-sm text-gray-400">No tasks for this module yet.</div> :
            <div className="space-y-2">
              {(m.tasks || []).map((t: any) => (
                <Link key={t.id} href={`/planner/tasks/${t.id}`} className="card p-3 flex items-center gap-3 hover:bg-gray-50">
                  <span className="text-xl">{t.status === 'completed' ? '✅' : taskTypeMeta(t.type).emoji}</span>
                  <div className="flex-1 min-w-0"><p className={`text-sm font-medium truncate ${t.status === 'completed' ? 'line-through text-gray-400' : ''}`}>{t.title}</p></div>
                  {t.dueDate && t.status !== 'completed' && <span className="text-[11px] text-gray-500">{countdown(t.dueDate, t.dueTime).label}</span>}
                </Link>
              ))}
            </div>
          )}

          {tab === 'topics' && (
            <div>
              <div className="flex gap-2 mb-3">
                <input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTopic()} placeholder="Add a topic (e.g. SQL)" className="input-field flex-1" />
                <button onClick={addTopic} className="btn-primary px-4"><Plus size={16} /></button>
              </div>
              {topics.length > 0 && (
                <p className="text-xs text-gray-400 mb-3">Self-reported study progress · tap a status to advance it</p>
              )}
              {topics.length === 0 ? <div className="card p-6 text-center text-sm text-gray-400">No topics yet. Add the topics you need to study.</div> :
                <div className="space-y-2">
                  {topics.map((tp: any) => {
                    const sm = topicStatusMeta(tp.status);
                    return (
                      <div key={tp.id} className="card p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{tp.name}</p></div>
                        <button onClick={() => cycleTopic(tp)} className={`badge-pill text-[11px] ${sm.color}`}>{sm.label}</button>
                        <button onClick={() => delTopic(tp.id)} className="text-gray-300 hover:text-red-500"><X size={16} /></button>
                      </div>
                    );
                  })}
                </div>
              }
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
