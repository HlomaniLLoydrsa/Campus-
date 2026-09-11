'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { useApp } from '@/context/AppContext';
import { taskTypeMeta, priorityMeta, countdown } from '@/lib/planner';
import { CalendarDays, Clock, AlertTriangle, Target, CheckCircle2, BookOpen, ArrowRight, Plus, Layers, ListTodo } from 'lucide-react';

export default function PlannerDashboardPage() {
  const { currentUser } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'assignment' | 'test' | 'exam' | 'project'>('all');

  useEffect(() => {
    fetch('/api/planner/dashboard').then(r => r.ok ? r.json() : null).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();
  const firstName = (currentUser.name || 'there').split(' ')[0];

  const deadlines = (data?.upcomingDeadlines || []).filter((t: any) => filter === 'all' || t.type === filter);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-5">
            <h1 className="text-2xl font-bold">{greeting}, {firstName} 👋</h1>
            <p className="text-sm text-gray-500 mt-1">Here&apos;s what needs your attention.</p>
          </div>

          {/* Quick nav */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            <Link href="/planner/tasks" className="card p-3 flex flex-col items-center gap-1 hover:bg-gray-50"><ListTodo size={18} className="text-campus-primary" /><span className="text-[10px] font-medium text-gray-600">Tasks</span></Link>
            <Link href="/planner/modules" className="card p-3 flex flex-col items-center gap-1 hover:bg-gray-50"><Layers size={18} className="text-indigo-500" /><span className="text-[10px] font-medium text-gray-600">Modules</span></Link>
            <Link href="/planner/calendar" className="card p-3 flex flex-col items-center gap-1 hover:bg-gray-50"><CalendarDays size={18} className="text-green-500" /><span className="text-[10px] font-medium text-gray-600">Calendar</span></Link>
            <Link href="/planner/tasks?new=1" className="card p-3 flex flex-col items-center gap-1 hover:bg-gray-50"><Plus size={18} className="text-campus-accent" /><span className="text-[10px] font-medium text-gray-600">Add</span></Link>
          </div>

          {loading ? (
            <div className="space-y-3">{[0,1,2].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}</div>
          ) : !data ? (
            <div className="card p-8 text-center text-gray-500">Could not load your planner.</div>
          ) : data.moduleCount === 0 && data.counts.openTasks === 0 ? (
            <div className="card p-8 text-center">
              <CalendarDays size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="font-semibold text-gray-700">Your academic life, organised</p>
              <p className="text-sm text-gray-400 mt-1">Add your modules and deadlines to get started.</p>
              <div className="flex gap-2 justify-center mt-4">
                <Link href="/planner/modules" className="btn-secondary text-sm">Add modules</Link>
                <Link href="/planner/tasks?new=1" className="btn-primary text-sm">Add a task</Link>
              </div>
            </div>
          ) : (
            <>
              {/* Overview cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                <OverviewCard icon={Clock} label="Due today" value={data.counts.dueToday} tint="text-blue-600 bg-blue-50" />
                <OverviewCard icon={AlertTriangle} label="Overdue" value={data.counts.overdue} tint="text-red-600 bg-red-50" />
                <OverviewCard icon={Target} label="Exams ahead" value={data.counts.upcomingExams} tint="text-purple-600 bg-purple-50" />
                <OverviewCard icon={BookOpen} label="Study hrs (wk)" value={data.counts.plannedHoursWeek} tint="text-teal-600 bg-teal-50" />
                <OverviewCard icon={CheckCircle2} label="Completed" value={data.counts.completed} tint="text-green-600 bg-green-50" />
                <OverviewCard icon={ListTodo} label="Open tasks" value={data.counts.openTasks} tint="text-campus-primary bg-campus-primary/10" />
              </div>

              {/* NEXT UP */}
              {data.nextUp && (
                <div className="card p-4 mb-5 border-l-4 border-campus-primary">
                  <p className="text-[11px] font-semibold text-campus-primary uppercase tracking-wide mb-1">Next up</p>
                  <NextUpBody t={data.nextUp} />
                </div>
              )}

              {/* TODAY'S PLAN */}
              {data.todaySessions?.length > 0 && (
                <div className="mb-5">
                  <h2 className="font-bold text-sm mb-2">Today&apos;s plan</h2>
                  <div className="space-y-2">
                    {data.todaySessions.map((s: any) => (
                      <Link key={s.id} href={`/planner/study/${s.id}`} className="card p-3 flex items-center gap-3 hover:bg-gray-50">
                        <span className="text-xs font-semibold text-campus-primary w-12">{s.startTime || '—'}</span>
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{s.title}</p>{s.goal && <p className="text-[11px] text-gray-400 truncate">{s.goal}</p>}</div>
                        <span className={`badge-pill text-[10px] ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.status}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* WORKLOAD SNAPSHOT */}
              <div className="card p-4 mb-5 bg-gradient-to-r from-teal-50 to-blue-50 border-teal-100">
                <h3 className="font-bold text-sm mb-2">This week</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-lg font-bold text-campus-primary">{data.week.taskCount}</p><p className="text-[11px] text-gray-500">deadlines</p></div>
                  <div><p className="text-lg font-bold text-teal-600">{data.week.sessionCount}</p><p className="text-[11px] text-gray-500">sessions</p></div>
                  <div><p className="text-lg font-bold text-blue-600">{data.week.hours}h</p><p className="text-[11px] text-gray-500">planned study</p></div>
                </div>
                {data.week.overloadedDay && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 mt-3">Your {new Date(data.week.overloadedDay.date + 'T00:00').toLocaleDateString(undefined, { weekday: 'long' })} has {data.week.overloadedDay.hours}h of planned work. Consider spreading it out.</p>
                )}
              </div>

              {/* UPCOMING DEADLINES */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold text-sm">Upcoming deadlines</h2>
                  <Link href="/planner/tasks" className="text-xs text-campus-primary font-medium">See all</Link>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-2 -mx-1 px-1">
                  {(['all','assignment','test','exam','project'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap capitalize ${filter === f ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>{f}</button>
                  ))}
                </div>
                {deadlines.length === 0 ? (
                  <div className="card p-6 text-center text-sm text-gray-400">No upcoming deadlines.</div>
                ) : (
                  <div className="space-y-2">
                    {deadlines.map((t: any) => <DeadlineRow key={t.id} t={t} />)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function OverviewCard({ icon: Icon, label, value, tint }: { icon: any; label: string; value: number; tint: string }) {
  return (
    <div className="card p-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tint}`}><Icon size={16} /></div>
      <p className="text-xl font-bold mt-2">{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  );
}

function NextUpBody({ t }: { t: any }) {
  const cd = countdown(t.dueDate, t.dueTime);
  const meta = taskTypeMeta(t.type);
  const pm = priorityMeta(t.priority);
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{meta.emoji} {t.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t.module ? `${t.module.code || t.module.name} · ` : ''}{cd.label}</p>
        </div>
        <span className={`badge-pill text-[10px] ${pm.color}`}>{pm.label}</span>
      </div>
      <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-campus-primary rounded-full" style={{ width: `${t.progress || 0}%` }} /></div>
      <div className="flex gap-2 mt-3">
        <Link href={`/planner/tasks/${t.id}`} className="btn-primary text-xs flex items-center gap-1">View task <ArrowRight size={12} /></Link>
      </div>
    </>
  );
}

function DeadlineRow({ t }: { t: any }) {
  const cd = countdown(t.dueDate, t.dueTime);
  const meta = taskTypeMeta(t.type);
  return (
    <Link href={`/planner/tasks/${t.id}`} className="card p-3 flex items-center gap-3 hover:bg-gray-50">
      <span className="text-xl">{meta.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{t.title}</p>
        <p className="text-[11px] text-gray-400 truncate">{t.module ? `${t.module.code || t.module.name}` : meta.label}</p>
      </div>
      <span className={`text-[11px] font-medium ${cd.overdue ? 'text-red-500' : cd.soon ? 'text-orange-500' : 'text-gray-500'}`}>{cd.label}</span>
    </Link>
  );
}
