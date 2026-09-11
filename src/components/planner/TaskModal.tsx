'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { PlannerModule, TASK_TYPES, PRIORITIES } from '@/lib/planner';

export default function TaskModal({ modules, initial, onClose, onDone }: { modules: PlannerModule[]; initial?: any; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    title: initial?.title || '', type: initial?.type || 'assignment', moduleId: initial?.moduleId || '',
    dueDate: initial?.dueDate || '', dueTime: initial?.dueTime || '', priority: initial?.priority || 'medium',
    estimatedHours: initial?.estimatedHours || '', description: initial?.description || '', notes: initial?.notes || '',
  });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.title.trim()) { setError('Give it a title'); return; }
    setBusy(true);
    try {
      const url = initial ? `/api/planner/tasks/${initial.id}` : '/api/planner/tasks';
      const method = initial ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, estimatedHours: Number(form.estimatedHours) || 0 }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Failed'); setBusy(false); return; }
      onDone();
    } catch { setError('Something went wrong.'); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 mb-16 lg:mb-0">
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-lg">{initial ? 'Edit Task' : 'New Task'}</h2><button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button></div>
        {error && <div className="p-3 mb-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>}
        <div className="space-y-3">
          <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Task title (e.g. COS301 Assignment 2)" className="input-field" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.type} onChange={(e) => set('type', e.target.value)} className="input-field">{TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}</select>
            <select value={form.moduleId} onChange={(e) => set('moduleId', e.target.value)} className="input-field"><option value="">No module</option>{modules.map(m => <option key={m.id} value={m.id}>{m.code || m.name}</option>)}</select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-gray-500 block mb-1">Due date</label><input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} className="input-field" /></div>
            <div><label className="text-xs text-gray-500 block mb-1">Due time</label><input type="time" value={form.dueTime} onChange={(e) => set('dueTime', e.target.value)} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.priority} onChange={(e) => set('priority', e.target.value)} className="input-field">{PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label} priority</option>)}</select>
            <input type="number" value={form.estimatedHours} onChange={(e) => set('estimatedHours', e.target.value)} placeholder="Est. hours" className="input-field" />
          </div>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Description" rows={2} className="input-field resize-none" />
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Notes" rows={2} className="input-field resize-none" />
          <button onClick={submit} disabled={busy} className="btn-primary w-full disabled:opacity-50">{busy ? 'Saving…' : (initial ? 'Save changes' : 'Create task')}</button>
        </div>
      </div>
    </div>
  );
}
