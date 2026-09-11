import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

// GET /api/planner/dashboard — everything the Planner landing page needs, in one call.
export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const db = await getDb();

  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (local-ish; UI uses same)

  const tasksRaw = await db.prepare("SELECT * FROM planner_tasks WHERE userId = ? AND status != 'cancelled'").all(userId) as any[];
  const tasks = tasksRaw.map(t => ({ ...t, topicIds: JSON.parse(t.topicIds || '[]') }));

  const modules = await db.prepare('SELECT id, code, name, color FROM planner_modules WHERE userId = ? AND archived = 0').all(userId) as any[];
  const modMap: Record<string, any> = {};
  modules.forEach(m => { modMap[m.id] = m; });

  const open = tasks.filter(t => t.status !== 'completed');
  const dueToday = open.filter(t => t.dueDate === todayStr);
  const overdue = open.filter(t => t.dueDate && t.dueDate < todayStr);
  const upcomingExams = open.filter(t => t.type === 'exam' && t.dueDate && t.dueDate >= todayStr)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  // Next up = nearest non-completed task with a due date.
  const upcoming = open.filter(t => t.dueDate && t.dueDate >= todayStr).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  const nextUp = upcoming[0] || null;

  // Today's sessions
  const todaySessions = await db.prepare("SELECT * FROM planner_sessions WHERE userId = ? AND date = ? ORDER BY startTime ASC").all(userId, todayStr) as any[];

  // Missed sessions: planned but their date has already passed.
  const missedRow = await db.prepare("SELECT COUNT(*) as c FROM planner_sessions WHERE userId = ? AND status = 'planned' AND date != '' AND date < ?").get(userId, todayStr) as any;
  const missedSessions = missedRow?.c || 0;

  // Workload this week (next 7 days): count tasks due + planned session hours.
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);
  const weekTasks = open.filter(t => t.dueDate && t.dueDate >= todayStr && t.dueDate <= weekEndStr);
  const weekSessions = await db.prepare("SELECT * FROM planner_sessions WHERE userId = ? AND date >= ? AND date <= ? AND status = 'planned'").all(userId, todayStr, weekEndStr) as any[];
  const weekHours = Math.round((weekSessions.reduce((s, x) => s + (x.durationMin || 0), 0) / 60) * 10) / 10;

  // Per-day workload (planned session minutes) for the week — for the "overloaded day" hint.
  const byDay: Record<string, number> = {};
  weekSessions.forEach(x => { byDay[x.date] = (byDay[x.date] || 0) + (x.durationMin || 0); });
  const heaviest = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  const overloadedDay = heaviest && heaviest[1] >= 240 ? { date: heaviest[0], hours: Math.round((heaviest[1] / 60) * 10) / 10 } : null;

  const decorate = (t: any) => ({ ...t, module: t.moduleId ? modMap[t.moduleId] || null : null });

  return NextResponse.json({
    counts: {
      dueToday: dueToday.length,
      overdue: overdue.length,
      upcomingExams: upcomingExams.length,
      completed: completedCount,
      plannedHoursWeek: weekHours,
      openTasks: open.length,
    },
    nextUp: nextUp ? decorate(nextUp) : null,
    todaySessions,
    missedSessions,
    upcomingDeadlines: upcoming.slice(0, 10).map(decorate),
    upcomingExams: upcomingExams.slice(0, 5).map(decorate),
    week: { taskCount: weekTasks.length, sessionCount: weekSessions.length, hours: weekHours, overloadedDay },
    moduleCount: modules.length,
  });
}
