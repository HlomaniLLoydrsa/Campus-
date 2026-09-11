import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

const DEFAULTS = { remindAssignments: 1, remindExams: 1, remindSessions: 1, remindOverdue: 1 };

// GET /api/planner/prefs — the user's reminder preferences (with defaults).
export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const db = await getDb();
  const row = await db.prepare('SELECT * FROM planner_prefs WHERE userId = ?').get(userId) as any;
  return NextResponse.json(row ? {
    remindAssignments: row.remindAssignments, remindExams: row.remindExams,
    remindSessions: row.remindSessions, remindOverdue: row.remindOverdue,
  } : DEFAULTS);
}

// PUT /api/planner/prefs — upsert reminder preferences.
export async function PUT(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const b = await request.json();
  const v = (x: any, fallback: number) => (x === 0 || x === 1 ? x : (x === true ? 1 : x === false ? 0 : fallback));
  const p = {
    remindAssignments: v(b.remindAssignments, 1),
    remindExams: v(b.remindExams, 1),
    remindSessions: v(b.remindSessions, 1),
    remindOverdue: v(b.remindOverdue, 1),
  };
  const db = await getDb();
  await db.prepare(
    `INSERT INTO planner_prefs (userId, remindAssignments, remindExams, remindSessions, remindOverdue, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(userId) DO UPDATE SET remindAssignments = excluded.remindAssignments, remindExams = excluded.remindExams,
       remindSessions = excluded.remindSessions, remindOverdue = excluded.remindOverdue, updatedAt = excluded.updatedAt`
  ).run(userId, p.remindAssignments, p.remindExams, p.remindSessions, p.remindOverdue, new Date().toISOString());
  return NextResponse.json(p);
}
