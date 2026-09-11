import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';

// GET /api/planner/tasks?moduleId=&type=&status= — the user's tasks.
export async function GET(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { searchParams } = new URL(request.url);
  const moduleId = searchParams.get('moduleId');
  const type = searchParams.get('type');
  const status = searchParams.get('status');

  const where = ['userId = ?']; const args: any[] = [userId];
  if (moduleId) { where.push('moduleId = ?'); args.push(moduleId); }
  if (type) { where.push('type = ?'); args.push(type); }
  if (status) { where.push('status = ?'); args.push(status); }

  const rows = await db_all(await getDb(), `SELECT * FROM planner_tasks WHERE ${where.join(' AND ')} ORDER BY dueDate ASC, createdAt DESC`, args);
  return NextResponse.json(rows.map((t: any) => ({ ...t, topicIds: JSON.parse(t.topicIds || '[]') })));
}

async function db_all(db: any, sql: string, args: any[]) { return db.prepare(sql).all(...args) as any[]; }

// POST /api/planner/tasks — create a task.
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const b = await request.json();
  if (!b.title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  const db = await getDb();
  const id = `ptk_${crypto.randomUUID().slice(0, 8)}`;
  await db.prepare(
    `INSERT INTO planner_tasks (id, userId, moduleId, title, type, description, dueDate, dueTime, priority, status, progress, estimatedHours, topicIds, notes, pinned, resourceId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, userId, b.moduleId || null, b.title.trim(), b.type || 'assignment', (b.description || '').trim(),
    (b.dueDate || '').trim(), (b.dueTime || '').trim(), b.priority || 'medium', b.status || 'not-started',
    Number(b.progress) || 0, Number(b.estimatedHours) || 0, JSON.stringify(Array.isArray(b.topicIds) ? b.topicIds : []),
    (b.notes || '').trim(), b.pinned ? 1 : 0, b.resourceId || null, new Date().toISOString()
  );
  const created = await db.prepare('SELECT * FROM planner_tasks WHERE id = ?').get(id) as any;
  return NextResponse.json({ ...created, topicIds: JSON.parse(created.topicIds || '[]') }, { status: 201 });
}
