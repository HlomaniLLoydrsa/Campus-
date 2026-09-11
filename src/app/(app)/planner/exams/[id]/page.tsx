'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { taskTypeMeta, countdown, topicStatusMeta, TOPIC_STATUSES, TopicStatus } from '@/lib/planner';
import { ArrowLeft, Clock, GraduationCap, BookOpen, Plus, CalendarRange, Check, X } from 'lucide-react';

export default function ExamPrepPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [e, setE] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState(false);

  const load = useCallback(async () => {
    try { const r = await fetch(`/api/planner/exams/${id}`); if (r.ok) setE(await r.json()); } catch {}
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const patchExam = async (body: any) => { const r = await fetch(`/api/planner/exams/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (r.ok) load(); };
  const setTopicStatus = async (topicId: string, status: TopicStatus) => {
    await fetch('/api/planner/topics', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: topicId, status }) });
    load();
  };

  if (loading) return <Shell><div className="card h-56 animate-pulse bg-gray-100" /></Shell>;
  if (!e) return <Shell><div className="flex items-center justify-center h-96 text-gray-500">Not found</div></Shell>;

  const meta = taskTypeMeta(e.type);
  const cd = countdown(e.dueDate, e.dueTime);
  const done = e.status === 'completed';
  const attachedIds: string[] = e.topicIds || [];
  const unattached = (e.moduleTopics || []).filter((t: any) => !attachedIds.includes(t.id));

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push('/planner/exams')} className="flex items-center gap-1 text-sm text-campus-primary font-medium hover:underline"><ArrowLeft size={14} /> Exam Centre</button>
        <Link href={`/planner/tasks/${e.id}`} className="text-xs text-gray-500 hover:underline">Open as task</Link>
      </div>

      {/* Header + countdown */}
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{done ? '✅' : meta.emoji}</span>
          <div className="flex-1 min-w-0">
            <span className="badge-pill bg-gray-100 text-gray-600 text-xs">{meta.label}</span>
            <h1 className="font-bold text-lg mt-1.5">{e.title}</h1>
            {e.module && <Link href={`/planner/modules/${e.module.id}`} className="text-sm text-campus-primary">{e.module.code || e.module.name}</Link>}
          </div>
        </div>
        {e.dueDate && (
          <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 ${cd.overdue ? 'bg-red-50 text-red-700' : cd.soon ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-700'}`}>
            <Clock size={16} /><span className="text-sm font-semibold">{done ? 'Completed' : cd.label}</span>
            <span className="text-xs text-gray-400 ml-auto">{e.dueDate}{e.dueTime ? ` ${e.dueTime}` : ''}</span>
          </div>
        )}

        {/* Readiness */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">Readiness (self-reported)</span>
            <span className="text-sm font-bold">{e.prepProgress}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${e.prepProgress >= 80 ? 'bg-green-500' : e.prepProgress >= 40 ? 'bg-teal-500' : 'bg-amber-400'}`} style={{ width: `${e.prepProgress}%` }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">{e.attachedTopics.length ? `Based on ${e.attachedTopics.length} linked topic${e.attachedTopics.length === 1 ? '' : 's'}` : 'Link topics below to track readiness'}</p>
        </div>

        <div className="flex gap-2 mt-4">
          <Link href={`/planner/study/plan?taskId=${e.id}${e.moduleId ? `&moduleId=${e.moduleId}` : ''}`} className="btn-primary text-sm flex items-center gap-1"><CalendarRange size={15} /> Build revision plan</Link>
          <Link href={`/planner/study?taskId=${e.id}${e.moduleId ? `&moduleId=${e.moduleId}` : ''}`} className="btn-secondary text-sm flex items-center gap-1"><Plus size={15} /> Session</Link>
        </div>
      </div>

      {/* Topics checklist */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm flex items-center gap-2"><BookOpen size={16} className="text-campus-primary" /> Topics to master</h3>
          {e.moduleId && unattached.length > 0 && (
            <button onClick={() => setPicker(p => !p)} className="text-xs text-campus-primary font-medium">{picker ? 'Done' : '+ Add topics'}</button>
          )}
        </div>

        {picker && (
          <div className="card p-3 mb-2">
            <p className="text-[11px] text-gray-500 mb-2">Tap a topic to add it to this exam</p>
            <div className="flex flex-wrap gap-2">
              {unattached.length === 0 ? <span className="text-xs text-gray-400">All module topics added.</span> :
                unattached.map((t: any) => (
                  <button key={t.id} onClick={() => patchExam({ action: 'attachTopic', topicId: t.id })} className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 hover:border-campus-primary">+ {t.name}</button>
                ))}
            </div>
          </div>
        )}

        {e.attachedTopics.length === 0 ? (
          <div className="card p-5 text-center text-sm text-gray-400">
            {e.moduleId ? 'No topics linked yet. Add some to track your readiness.' : 'Assign this exam to a module to link topics.'}
          </div>
        ) : (
          <div className="space-y-2">
            {e.attachedTopics.map((t: any) => {
              const sm = topicStatusMeta(t.status);
              return (
                <div key={t.id} className="card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`badge-pill text-[10px] ${sm.color}`}>{sm.label}</span>
                      <button onClick={() => patchExam({ action: 'detachTopic', topicId: t.id })} className="text-gray-300 hover:text-red-500" aria-label="Remove"><X size={14} /></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {TOPIC_STATUSES.map(s => (
                      <button key={s.value} onClick={() => setTopicStatus(t.id, s.value)} className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition ${t.status === s.value ? s.color + ' border-transparent' : 'bg-white text-gray-500 border-gray-200'}`}>
                        {t.status === s.value && <Check size={9} className="inline mr-0.5" />}{s.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Revision sessions */}
      <div className="mt-5">
        <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><CalendarRange size={16} className="text-teal-500" /> Revision sessions {e.sessions.length > 0 && <span className="text-xs text-gray-400 font-normal">({e.revisionDone}/{e.sessions.length} done)</span>}</h3>
        {e.sessions.length === 0 ? (
          <div className="card p-5 text-center text-sm text-gray-400">No revision sessions yet. Build a revision plan to spread them out.</div>
        ) : (
          <div className="space-y-2">
            {e.sessions.map((s: any) => (
              <Link key={s.id} href={`/planner/study/${s.id}`} className="card p-3 flex items-center gap-3 hover:bg-gray-50 border-l-4 border-teal-400">
                <span className="text-xs font-semibold text-teal-600 w-20">{s.date}</span>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{s.title}</p><p className="text-[11px] text-gray-400">{s.startTime || '—'} · {s.durationMin}min</p></div>
                <span className={`badge-pill text-[10px] ${s.status === 'completed' ? 'bg-green-100 text-green-700' : s.status === 'skipped' ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'}`}>{s.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
