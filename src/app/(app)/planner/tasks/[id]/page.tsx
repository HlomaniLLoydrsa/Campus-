'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { taskTypeMeta, priorityMeta, countdown, PlannerModule } from '@/lib/planner';
import TaskModal from '@/components/planner/TaskModal';
import { ArrowLeft, Edit2, Trash2, CheckCircle2, RotateCcw, Clock, BookOpen, Plus, GraduationCap } from 'lucide-react';

export default function PlannerTaskDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [t, setT] = useState<any>(null);
  const [modules, setModules] = useState<PlannerModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [tr, mr] = await Promise.all([fetch(`/api/planner/tasks/${id}`), fetch('/api/planner/modules')]);
      if (tr.ok) setT(await tr.json());
      if (mr.ok) setModules(await mr.json());
    } catch {}
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const patch = async (body: any) => { const r = await fetch(`/api/planner/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (r.ok) load(); };

  if (loading) return <div className="flex min-h-screen"><Sidebar /><main className="flex-1"><TopBar /><div className="max-w-2xl mx-auto px-4 py-6"><div className="card h-56 animate-pulse bg-gray-100" /></div></main><BottomNav /></div>;
  if (!t) return <div className="flex min-h-screen"><Sidebar /><main className="flex-1"><TopBar /><div className="flex items-center justify-center h-96 text-gray-500">Task not found</div></main><BottomNav /></div>;

  const meta = taskTypeMeta(t.type); const pm = priorityMeta(t.priority);
  const cd = countdown(t.dueDate, t.dueTime);
  const done = t.status === 'completed';

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => router.push('/planner/tasks')} className="flex items-center gap-1 text-sm text-campus-primary font-medium hover:underline"><ArrowLeft size={14} /> Tasks</button>
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(true)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Edit2 size={16} /></button>
              <button onClick={async () => { if (confirm('Delete this task?')) { await fetch(`/api/planner/tasks/${id}`, { method: 'DELETE' }); router.push('/planner/tasks'); } }} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{done ? '✅' : meta.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge-pill bg-gray-100 text-gray-600 text-xs">{meta.label}</span>
                  <span className={`badge-pill text-xs ${pm.color}`}>{pm.label}</span>
                </div>
                <h1 className="font-bold text-lg mt-2">{t.title}</h1>
                {t.module && <Link href={`/planner/modules/${t.module.id}`} className="text-sm text-campus-primary mt-0.5 inline-block">{t.module.code || t.module.name}</Link>}
              </div>
            </div>

            {/* Countdown */}
            {t.dueDate && (
              <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 ${cd.overdue ? 'bg-red-50 text-red-700' : cd.soon ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-700'}`}>
                <Clock size={16} /><span className="text-sm font-semibold">{done ? 'Completed' : cd.label}</span>
                <span className="text-xs text-gray-400 ml-auto">{t.dueDate}{t.dueTime ? ` ${t.dueTime}` : ''}</span>
              </div>
            )}

            {/* Progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1"><span className="text-xs font-medium text-gray-500">Progress</span><span className="text-xs font-semibold">{t.progress || 0}%</span></div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2"><div className="h-full bg-campus-primary rounded-full transition-all" style={{ width: `${t.progress || 0}%` }} /></div>
              {!done && (
                <div className="flex gap-1">
                  {[25,50,75,100].map(p => <button key={p} onClick={() => patch({ action: 'progress', progress: p })} className="flex-1 text-xs py-1 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600">{p}%</button>)}
                </div>
              )}
            </div>

            {t.estimatedHours > 0 && <p className="text-xs text-gray-400 mt-3">Estimated workload: {t.estimatedHours}h</p>}
            {t.description && <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{t.description}</p>}
            {t.notes && <div className="mt-3 p-3 bg-gray-50 rounded-xl text-sm text-gray-600 whitespace-pre-wrap">{t.notes}</div>}

            <div className="flex gap-2 mt-5">
              {done ? (
                <button onClick={() => patch({ action: 'reopen' })} className="btn-secondary text-sm flex items-center gap-1"><RotateCcw size={15} /> Reopen</button>
              ) : (
                <button onClick={() => patch({ action: 'complete' })} className="btn-primary text-sm flex items-center gap-1"><CheckCircle2 size={15} /> Mark complete</button>
              )}
              <Link href={`/planner/study?taskId=${t.id}${t.moduleId ? `&moduleId=${t.moduleId}` : ''}`} className="btn-secondary text-sm flex items-center gap-1"><Plus size={15} /> Study session</Link>
              {['exam', 'test', 'quiz'].includes(t.type) && (
                <Link href={`/planner/exams/${t.id}`} className="btn-secondary text-sm flex items-center gap-1"><GraduationCap size={15} /> Exam prep</Link>
              )}
            </div>
          </div>

          {/* Related study sessions */}
          {t.sessions?.length > 0 && (
            <div className="mt-5">
              <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><BookOpen size={16} className="text-campus-primary" /> Study sessions</h3>
              <div className="space-y-2">
                {t.sessions.map((s: any) => (
                  <Link key={s.id} href={`/planner/study/${s.id}`} className="card p-3 flex items-center gap-3 hover:bg-gray-50">
                    <span className="text-xs font-semibold text-campus-primary w-20">{s.date}</span>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{s.title}</p></div>
                    <span className={`badge-pill text-[10px] ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.status}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {editing && <TaskModal modules={modules} initial={t} onClose={() => setEditing(false)} onDone={() => { setEditing(false); load(); }} />}
      </main>
      <BottomNav />
    </div>
  );
}
