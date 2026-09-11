'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { taskTypeMeta } from '@/lib/planner';
import { ArrowLeft, CalendarDays, Plus, CalendarRange } from 'lucide-react';

export default function PlannerCalendarPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/planner/tasks').then(r => r.ok ? r.json() : []),
      fetch('/api/planner/sessions').then(r => r.ok ? r.json() : []),
    ]).then(([t, s]) => { setTasks(t); setSessions(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  // Build an agenda: group items by date (next 30 days + overdue).
  const agenda = useMemo(() => {
    const map: Record<string, { tasks: any[]; sessions: any[] }> = {};
    const add = (date: string, kind: 'tasks' | 'sessions', item: any) => {
      if (!date) return;
      if (!map[date]) map[date] = { tasks: [], sessions: [] };
      map[date][kind].push(item);
    };
    tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate).forEach(t => add(t.dueDate, 'tasks', t));
    sessions.filter(s => s.date).forEach(s => add(s.date, 'sessions', s));
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tasks, sessions]);

  const fmtDay = (d: string) => {
    const date = new Date(d + 'T00:00');
    const today = new Date().toISOString().slice(0, 10);
    if (d === today) return 'Today';
    const tmr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    if (d === tmr) return 'Tomorrow';
    return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  };
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Link href="/planner" className="p-1 rounded-lg hover:bg-gray-100"><ArrowLeft size={18} /></Link>
              <h1 className="text-xl font-bold flex items-center gap-2"><CalendarDays className="text-campus-primary" size={22} /> Calendar</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/planner/study/plan" className="btn-secondary flex items-center gap-2 text-sm"><CalendarRange size={16} /> Plan</Link>
              <Link href="/planner/study" className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Session</Link>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">{[0,1,2].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-100" />)}</div>
          ) : agenda.length === 0 ? (
            <div className="card p-8 text-center">
              <CalendarDays size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Nothing scheduled.</p>
              <p className="text-sm text-gray-400 mt-1">Add tasks with due dates or plan study sessions.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {agenda.map(([date, items]) => {
                const overdue = date < todayStr;
                return (
                  <div key={date}>
                    <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${overdue ? 'text-red-500' : date === todayStr ? 'text-campus-primary' : 'text-gray-500'}`}>{fmtDay(date)}{overdue ? ' · overdue' : ''}</p>
                    <div className="space-y-2">
                      {items.tasks.map(t => (
                        <Link key={t.id} href={`/planner/tasks/${t.id}`} className="card p-3 flex items-center gap-3 hover:bg-gray-50 border-l-4 border-campus-accent">
                          <span className="text-lg">{taskTypeMeta(t.type).emoji}</span>
                          <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{t.title}</p><p className="text-[11px] text-gray-400">{taskTypeMeta(t.type).label}{t.dueTime ? ` · ${t.dueTime}` : ''}</p></div>
                        </Link>
                      ))}
                      {items.sessions.map(s => (
                        <Link key={s.id} href={`/planner/study/${s.id}`} className="card p-3 flex items-center gap-3 hover:bg-gray-50 border-l-4 border-teal-400">
                          <span className="text-xs font-semibold text-teal-600 w-12">{s.startTime || '📖'}</span>
                          <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{s.title}</p><p className="text-[11px] text-gray-400">Study · {s.durationMin}min{s.status !== 'planned' ? ` · ${s.status}` : ''}</p></div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
