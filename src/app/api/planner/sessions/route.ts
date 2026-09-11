import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';

// GET /api/planner/sessions?date=&moduleId=&taskId=&upcoming=1
export async function GET(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const moduleId = searchParams.get('moduleId');
  const taskId = searchParams.get('taskId');

  const where = ['userId = ?']; const args: any[] = [userId];
  if (date) { where.push('date = ?'); args.push(date); }
  if (moduleId) { where.push('moduleId = ?'); args.push(moduleId); }
  if (taskId) { where.push('taskId = ?'); args.push(taskId); }
  const db = await getDb();
  const rows = await db.prepare(`SELECT * FROM planner_sessions WHERE ${where.join(' AND ')} ORDER BY date ASC, startTime ASC`).all(...args);
  return NextResponse.json(rows);
}

// POST /api/planner/sessions
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const b = await request.json();
  if (!b.title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  const db = await getDb();
  const id = `pss_${crypto.randomUUID().slice(0, 8)}`;
  await db.prepare(
    `INSERT INTO planner_sessions (id, userId, moduleId, topicId, taskId, planId, title, date, startTime, endTime, durationMin, goal, status, actualMin, reflection, resourceId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', 0, '', ?, ?)`
  ).run(
    id, userId, b.moduleId || null, b.topicId || null, b.taskId || null, b.planId || null, b.title.trim(),
    (b.date || '').trim(), (b.startTime || '').trim(), (b.endTime || '').trim(), Number(b.durationMin) || 60,
    (b.goal || '').trim(), b.resourceId || null, new Date().toISOString()
  );
  return NextResponse.json(await db.prepare('SELECT * FROM planner_sessions WHERE id = ?').get(id), { status: 201 });
}
