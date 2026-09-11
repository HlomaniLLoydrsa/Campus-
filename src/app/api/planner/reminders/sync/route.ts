import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

/**
 * POST /api/planner/reminders/sync
 * Generates planner reminder notifications on-demand (no cron in this serverless setup).
 * Called when the user opens the Planner. Idempotent: reminder rows use a deterministic
 * PRIMARY KEY (kind + relatedId + local day) so INSERT OR IGNORE never duplicates them.
 * Respects the user's planner_prefs toggles.
 */
export async function POST() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const db = await getDb();

  const prefsRow = await db.prepare('SELECT * FROM planner_prefs WHERE userId = ?').get(userId) as any;
  const prefs = {
    remindAssignments: prefsRow ? prefsRow.remindAssignments : 1,
    remindExams: prefsRow ? prefsRow.remindExams : 1,
    remindSessions: prefsRow ? prefsRow.remindSessions : 1,
    remindOverdue: prefsRow ? prefsRow.remindOverdue : 1,
  };

  const now = new Date();
  const todayStr = ymdLocal(now);
  const dayKey = todayStr.replace(/-/g, '');
  const tomorrow = ymdLocal(addDays(now, 1));

  const created: string[] = [];
  const add = async (kind: string, relatedId: string, relatedType: string, message: string) => {
    const id = `nrem_${kind}_${relatedId}_${dayKey}`; // deterministic → dedup via PK
    const res = await db.prepare(
      'INSERT OR IGNORE INTO notifications (id, userId, type, message, relatedId, relatedType, read, createdAt) VALUES (?, ?, ?, ?, ?, ?, 0, ?)'
    ).run(id, userId, 'planner-reminder', message, relatedId, relatedType, now.toISOString());
    if (res.changes > 0) created.push(id);
  };

  // Open tasks with due dates.
  const tasks = await db.prepare(
    "SELECT id, title, type, dueDate FROM planner_tasks WHERE userId = ? AND status NOT IN ('completed','cancelled') AND dueDate != ''"
  ).all(userId) as any[];

  for (const t of tasks) {
    const isExam = ['exam', 'test', 'quiz'].includes(t.type);
    const isAssignment = !isExam;

    // Overdue.
    if (t.dueDate < todayStr) {
      if (prefs.remindOverdue) await add('overdue', t.id, 'planner-task', `Overdue: "${t.title}" was due ${t.dueDate}`);
      continue;
    }
    // Due today or tomorrow.
    if (t.dueDate === todayStr || t.dueDate === tomorrow) {
      const when = t.dueDate === todayStr ? 'today' : 'tomorrow';
      if (isExam && prefs.remindExams) await add('due', t.id, 'planner-task', `${cap(t.type)} "${t.title}" is ${when}`);
      else if (isAssignment && prefs.remindAssignments) await add('due', t.id, 'planner-task', `"${t.title}" is due ${when}`);
    }
  }

  // Sessions planned for today.
  if (prefs.remindSessions) {
    const sessions = await db.prepare(
      "SELECT id, title, startTime FROM planner_sessions WHERE userId = ? AND status = 'planned' AND date = ?"
    ).all(userId, todayStr) as any[];
    for (const s of sessions) {
      await add('session', s.id, 'planner-session', `Study session today${s.startTime ? ` at ${s.startTime}` : ''}: ${s.title}`);
    }
  }

  return NextResponse.json({ created: created.length });
}

function ymdLocal(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
