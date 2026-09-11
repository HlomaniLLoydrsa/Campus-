import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { examPrepProgress } from '@/lib/planner';

/**
 * GET /api/planner/ai/context — a READ-ONLY structured snapshot of the signed-in
 * user's academic state. Nothing here mutates data. It exists so a future AI
 * assistant can reason over the student's planner without each feature needing
 * to depend on the AI. Strictly scoped to the caller's own data.
 */
export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const db = await getDb();

  const todayStr = new Date().toISOString().slice(0, 10);

  const semester = await db.prepare('SELECT name, startDate, endDate FROM planner_semesters WHERE userId = ? AND active = 1 LIMIT 1').get(userId) as any;
  const modules = await db.prepare('SELECT id, code, name FROM planner_modules WHERE userId = ? AND archived = 0').all(userId) as any[];
  const tasksRaw = await db.prepare("SELECT id, moduleId, title, type, dueDate, dueTime, priority, status, progress FROM planner_tasks WHERE userId = ? AND status NOT IN ('cancelled')").all(userId) as any[];
  const topics = await db.prepare('SELECT moduleId, name, status FROM planner_topics WHERE userId = ?').all(userId) as any[];
  const sessions = await db.prepare("SELECT date, durationMin, status FROM planner_sessions WHERE userId = ?").all(userId) as any[];

  const modMap: Record<string, any> = {}; modules.forEach(m => { modMap[m.id] = m; });

  const open = tasksRaw.filter(t => t.status !== 'completed');
  const upcoming = open.filter(t => t.dueDate && t.dueDate >= todayStr).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  const overdue = open.filter(t => t.dueDate && t.dueDate < todayStr);

  const moduleReadiness = modules.map(m => {
    const mtopics = topics.filter(t => t.moduleId === m.id);
    return { code: m.code, name: m.name, topicCount: mtopics.length, readiness: examPrepProgress(mtopics as any[], 0) };
  });

  const plannedFuture = sessions.filter(s => s.status === 'planned' && s.date >= todayStr);
  const completedSessions = sessions.filter(s => s.status === 'completed');

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    semester: semester || null,
    moduleCount: modules.length,
    modules: modules.map(m => ({ code: m.code, name: m.name })),
    tasks: {
      open: open.length,
      overdue: overdue.length,
      upcoming: upcoming.slice(0, 20).map(t => ({
        title: t.title, type: t.type, module: t.moduleId ? modMap[t.moduleId]?.code || null : null,
        dueDate: t.dueDate, dueTime: t.dueTime, priority: t.priority, progress: t.progress,
      })),
    },
    moduleReadiness,
    study: {
      plannedFutureSessions: plannedFuture.length,
      plannedFutureHours: Math.round((plannedFuture.reduce((s, x) => s + (x.durationMin || 0), 0) / 60) * 10) / 10,
      completedSessions: completedSessions.length,
      completedHours: Math.round((completedSessions.reduce((s, x) => s + (x.durationMin || 0), 0) / 60) * 10) / 10,
    },
  });
}
