'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { taskTypeMeta, countdown } from '@/lib/planner';
import { ArrowLeft, GraduationCap } from 'lucide-react';

export default function ExamCentrePage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<'upcoming' | 'all'>('upcoming');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/planner/exams?scope=${scope}`).then(r => r.ok ? r.json() : []).then(d => { setExams(d); setLoading(false); }).catch(() => setLoading(false));
  }, [scope]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/planner" className="p-1 rounded-lg hover:bg-gray-100"><ArrowLeft size={18} /></Link>
            <h1 className="text-xl font-bold flex items-center gap-2"><GraduationCap className="text-campus-primary" size={22} /> Exam Prep Centre</h1>
          </div>
          <p className="text-sm text-gray-500 mb-4 ml-8">Track your readiness for every test and exam.</p>

          <div className="flex gap-2 mb-4">
            {(['upcoming', 'all'] as const).map(s => (
              <button key={s} onClick={() => setScope(s)} className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${scope === s ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>{s}</button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="card h-28 animate-pulse bg-gray-100" />)}</div>
          ) : exams.length === 0 ? (
            <div className="card p-8 text-center">
              <GraduationCap size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="font-semibold text-gray-700">No exams or tests yet</p>
              <p className="text-sm text-gray-400 mt-1">Add an exam or test task and it&apos;ll show up here with a readiness tracker.</p>
              <Link href="/planner/tasks?new=1" className="btn-primary text-sm inline-block mt-4">Add an assessment</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map(e => <ExamCard key={e.id} e={e} />)}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function ExamCard({ e }: { e: any }) {
  const meta = taskTypeMeta(e.type);
  const cd = countdown(e.dueDate, e.dueTime);
  const done = e.status === 'completed';
  return (
    <Link href={`/planner/exams/${e.id}`} className="card p-4 block hover:bg-gray-50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold flex items-center gap-2">{meta.emoji} {e.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{e.module ? `${e.module.code || e.module.name} · ` : ''}{meta.label}</p>
        </div>
        {e.dueDate && <span className={`text-xs font-medium whitespace-nowrap ${cd.overdue ? 'text-red-500' : cd.soon ? 'text-orange-500' : 'text-gray-500'}`}>{done ? 'Done' : cd.label}</span>}
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-gray-500">Readiness (self-reported)</span>
          <span className="text-[11px] font-semibold">{e.prepProgress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${e.prepProgress >= 80 ? 'bg-green-500' : e.prepProgress >= 40 ? 'bg-teal-500' : 'bg-amber-400'}`} style={{ width: `${e.prepProgress}%` }} />
        </div>
      </div>
      <div className="flex gap-3 mt-2 text-[11px] text-gray-400">
        <span>{e.masteredCount}/{e.topicCount} topics mastered</span>
        <span>·</span>
        <span>{e.completedSessions}/{e.sessionCount} revision sessions</span>
      </div>
    </Link>
  );
}
