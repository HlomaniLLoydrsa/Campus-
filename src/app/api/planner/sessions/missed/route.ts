import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

// GET /api/planner/sessions/missed — planned sessions whose date is in the past.
// Each comes with a suggested new date (next matching weekday) the user can approve.
export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const db = await getDb();

  const todayStr = ymdLocal(new Date());
  const missed = await db.prepare(
    "SELECT * FROM planner_sessions WHERE userId = ? AND status = 'planned' AND date != '' AND date < ? ORDER BY date ASC, startTime ASC"
  ).all(userId, todayStr) as any[];

  // Modules for labels.
  const modules = await db.prepare('SELECT id, code, name, color FROM planner_modules WHERE userId = ?').all(userId) as any[];
  const modMap: Record<string, any> = {}; modules.forEach(m => { modMap[m.id] = m; });

  // Suggest the soonest free slot: from tomorrow, skip days that already have >= 3 planned sessions.
  const busyByDay: Record<string, number> = {};
  const upcoming = await db.prepare("SELECT date FROM planner_sessions WHERE userId = ? AND status = 'planned' AND date >= ?").all(userId, todayStr) as any[];
  upcoming.forEach(s => { busyByDay[s.date] = (busyByDay[s.date] || 0) + 1; });

  let cursor = addDays(startOfDay(new Date()), 1);
  const nextFreeDate = (): string => {
    for (let i = 0; i < 30; i++) {
      const d = ymdLocal(cursor);
      if ((busyByDay[d] || 0) < 3) { busyByDay[d] = (busyByDay[d] || 0) + 1; cursor = addDays(cursor, 1); return d; }
      cursor = addDays(cursor, 1);
    }
    return ymdLocal(addDays(startOfDay(new Date()), 1));
  };

  const items = missed.map(s => ({
    ...s,
    module: s.moduleId ? modMap[s.moduleId] || null : null,
    suggestedDate: nextFreeDate(),
  }));

  return NextResponse.json({ count: items.length, sessions: items });
}

// POST /api/planner/sessions/missed — apply decisions the user approved.
// Body: { actions: [{ id, action: 'reschedule'|'skip', date?, startTime? }] }
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const b = await request.json();
  const actions = Array.isArray(b.actions) ? b.actions : [];
  if (!actions.length) return NextResponse.json({ error: 'No actions provided' }, { status: 400 });

  const db = await getDb();
  let rescheduled = 0, skipped = 0;

  for (const a of actions) {
    const s = await db.prepare('SELECT * FROM planner_sessions WHERE id = ?').get(a.id) as any;
    if (!s || s.userId !== userId) continue; // silently skip anything not owned
    if (s.status !== 'planned') continue;    // only act on still-planned sessions

    if (a.action === 'skip') {
      await db.prepare('UPDATE planner_sessions SET status = ? WHERE id = ?').run('skipped', a.id);
      skipped++;
    } else if (a.action === 'reschedule' && a.date) {
      await db.prepare('UPDATE planner_sessions SET date = ?, startTime = ?, status = ? WHERE id = ?').run(
        String(a.date), a.startTime != null ? String(a.startTime) : s.startTime, 'planned', a.id
      );
      rescheduled++;
    }
  }

  return NextResponse.json({ rescheduled, skipped });
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function ymdLocal(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
