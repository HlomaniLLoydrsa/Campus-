import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';

// GET /api/planner/plans — the user's study plans, each with its generated sessions summarized.
export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const db = await getDb();
  const plans = await db.prepare('SELECT * FROM planner_plans WHERE userId = ? ORDER BY createdAt DESC').all(userId) as any[];
  const out = [];
  for (const p of plans) {
    const sessions = await db.prepare('SELECT id, date, startTime, durationMin, status FROM planner_sessions WHERE planId = ? ORDER BY date ASC, startTime ASC').all(p.id) as any[];
    const done = sessions.filter(s => s.status === 'completed').length;
    out.push({ ...p, sessionCount: sessions.length, completedCount: done, sessions });
  }
  return NextResponse.json(out);
}

// POST /api/planner/plans — commit a study plan: create the plan record + its sessions.
// Body: { moduleId?, taskId?, goal?, targetDate, sessions: [{ date, startTime, durationMin, title?, topicId?, goal? }] }
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const b = await request.json();
  const sessions = Array.isArray(b.sessions) ? b.sessions : [];
  if (!sessions.length) return NextResponse.json({ error: 'A study plan needs at least one session' }, { status: 400 });

  const db = await getDb();

  // Verify module + task ownership if provided.
  if (b.moduleId) {
    const m = await db.prepare('SELECT userId FROM planner_modules WHERE id = ?').get(b.moduleId) as any;
    if (!m || m.userId !== userId) return NextResponse.json({ error: 'Not authorized for that module' }, { status: 403 });
  }
  if (b.taskId) {
    const t = await db.prepare('SELECT userId FROM planner_tasks WHERE id = ?').get(b.taskId) as any;
    if (!t || t.userId !== userId) return NextResponse.json({ error: 'Not authorized for that task' }, { status: 403 });
  }

  const planId = `pln_${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  await db.prepare('INSERT INTO planner_plans (id, userId, moduleId, taskId, goal, targetDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    planId, userId, b.moduleId || null, b.taskId || null, (b.goal || '').trim(), (b.targetDate || '').trim(), now
  );

  for (const s of sessions) {
    const id = `pss_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare(
      `INSERT INTO planner_sessions (id, userId, moduleId, topicId, taskId, planId, title, date, startTime, endTime, durationMin, goal, status, actualMin, reflection, resourceId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', 0, '', ?, ?)`
    ).run(
      id, userId, b.moduleId || null, s.topicId || null, b.taskId || null, planId,
      (s.title || b.goal || 'Study session').toString().trim() || 'Study session',
      (s.date || '').trim(), (s.startTime || '').trim(), (s.endTime || '').trim(),
      Number(s.durationMin) || 60, (s.goal || '').trim(), s.resourceId || null, now
    );
  }

  return NextResponse.json({ id: planId, sessionCount: sessions.length }, { status: 201 });
}
