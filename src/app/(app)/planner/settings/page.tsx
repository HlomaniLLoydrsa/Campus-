'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import { ArrowLeft, Bell } from 'lucide-react';

interface Prefs { remindAssignments: number; remindExams: number; remindSessions: number; remindOverdue: number; }

const TOGGLES: { key: keyof Prefs; label: string; help: string }[] = [
  { key: 'remindAssignments', label: 'Assignment deadlines', help: 'A heads-up the day before and the day an assignment is due.' },
  { key: 'remindExams', label: 'Exams & tests', help: 'Reminders as your exams and tests approach.' },
  { key: 'remindSessions', label: 'Study sessions', help: 'A nudge on days you have study sessions planned.' },
  { key: 'remindOverdue', label: 'Overdue tasks', help: 'A gentle note when something slips past its due date.' },
];

export default function PlannerSettingsPage() {
  const [prefs, setPrefs] = useState<Prefs>({ remindAssignments: 1, remindExams: 1, remindSessions: 1, remindOverdue: 1 });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/planner/prefs').then(r => r.ok ? r.json() : null).then(d => { if (d) setPrefs(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const toggle = async (key: keyof Prefs) => {
    const next = { ...prefs, [key]: prefs[key] ? 0 : 1 };
    setPrefs(next);
    setSaved(false);
    try {
      await fetch('/api/planner/prefs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {}
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen pb-20 lg:pb-0">
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/planner" className="p-1 rounded-lg hover:bg-gray-100"><ArrowLeft size={18} /></Link>
            <h1 className="text-xl font-bold flex items-center gap-2"><Bell className="text-campus-primary" size={22} /> Reminders</h1>
          </div>
          <p className="text-sm text-gray-500 mb-4 ml-8">Choose what the Planner reminds you about. Reminders arrive in your notifications.</p>

          {loading ? (
            <div className="card h-48 animate-pulse bg-gray-100" />
          ) : (
            <div className="card divide-y divide-gray-100">
              {TOGGLES.map(t => (
                <div key={t.key} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{t.help}</p>
                  </div>
                  <button role="switch" aria-checked={!!prefs[t.key]} onClick={() => toggle(t.key)}
                    className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${prefs[t.key] ? 'bg-campus-primary' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${prefs[t.key] ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {saved && <p className="text-xs text-green-600 mt-3 text-center">Saved</p>}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
