'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { PlannerTask, PlannerModule, TASK_TYPES, taskTypeMeta, priorityMeta, countdown } from '@/lib/planner';
import { ArrowLeft, Plus, ListTodo } from 'lucide-react';
import TaskModal from '@/components/planner/TaskModal';

export default function PlannerTasksPage() {
  return <Suspense fallback={null}><TasksContent /></Suspense>;
}

function TasksContent() {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [modules, setModules] = useState<PlannerModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'open' | 'completed' | 'all'>('open');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, mRes] = await Promise.all([fetch('/api/planner/tasks'), fetch('/api/planner/modules')]);
      if (tRes.ok) setTasks(await tRes.json());
      if (mRes.ok) setModules(await mRes.json());
    } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (searchParams.get('new') === '1') setShowCreate(true); }, [searchParams]);

  const filtered = tasks.filter(t => {
    if (statusFilter === 'open' && t.status === 'completed') return false;
    if (statusFilter === 'completed' && t.status !== 'completed') return false;
    if (typeFilter && t.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Link href="/planner" className="p-1 rounded-lg hover:bg-gray-100"><ArrowLeft size={18} /></Link>
              <h1 className="text-xl font-bold flex items-center gap-2"><ListTodo className="text-campus-primary" size={22} /> Tasks</h1>
            </div>
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Add</button>
          </div>

          <div className="flex gap-2 mb-3">
            {(['open','completed','all'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize ${statusFilter === s ? 'bg-campus-primary text-white' : 'bg-gray-100 text-gray-600'}`}>{s}</button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-4 -mx-1 px-1">
            <button onClick={() => setTypeFilter('')} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${!typeFilter ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>All types</button>
            {TASK_TYPES.map(t => <button key={t.value} onClick={() => setTypeFilter(typeFilter === t.value ? '' : t.value)} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${typeFilter === t.value ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>{t.emoji} {t.label}</button>)}
          </div>

          {loading ? (
            <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="card h-16 animate-pulse bg-gray-100" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="card p-8 text-center">
              <ListTodo size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No tasks yet. Add your first assignment.</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary text-sm mt-4">Add a task</button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(t => {
                const meta = taskTypeMeta(t.type); const pm = priorityMeta(t.priority);
                const cd = countdown(t.dueDate, t.dueTime);
                const mod = modules.find(m => m.id === t.moduleId);
                const done = t.status === 'completed';
                return (
                  <Link key={t.id} href={`/planner/tasks/${t.id}`} className="card p-3 flex items-center gap-3 hover:bg-gray-50">
                    <span className="text-xl">{done ? '✅' : meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${done ? 'line-through text-gray-400' : ''}`}>{t.title}</p>
                      <p className="text-[11px] text-gray-400 truncate">{mod ? (mod.code || mod.name) + ' · ' : ''}{meta.label}</p>
                    </div>
                    {!done && <span className={`badge-pill text-[9px] ${pm.color}`}>{pm.label}</span>}
                    {t.dueDate && <span className={`text-[11px] font-medium whitespace-nowrap ${cd.overdue ? 'text-red-500' : cd.soon ? 'text-orange-500' : 'text-gray-500'}`}>{done ? '' : cd.label}</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {showCreate && <TaskModal modules={modules} onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); load(); }} />}
      </main>
      <BottomNav />
    </div>
  );
}
