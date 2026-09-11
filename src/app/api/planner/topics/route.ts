import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';

// GET /api/planner/topics?moduleId=
export async function GET(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { searchParams } = new URL(request.url);
  const moduleId = searchParams.get('moduleId');
  const db = await getDb();
  const rows = moduleId
    ? await db.prepare('SELECT * FROM planner_topics WHERE userId = ? AND moduleId = ? ORDER BY createdAt ASC').all(userId, moduleId)
    : await db.prepare('SELECT * FROM planner_topics WHERE userId = ? ORDER BY createdAt ASC').all(userId);
  return NextResponse.json(rows);
}

// POST /api/planner/topics
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const b = await request.json();
  if (!b.moduleId || !b.name?.trim()) return NextResponse.json({ error: 'moduleId and name required' }, { status: 400 });
  const db = await getDb();
  // Ensure the module belongs to the caller.
  const m = await db.prepare('SELECT userId FROM planner_modules WHERE id = ?').get(b.moduleId) as any;
  if (!m || m.userId !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const id = `tpc_${crypto.randomUUID().slice(0, 8)}`;
  await db.prepare('INSERT INTO planner_topics (id, userId, moduleId, name, status, priority, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, userId, b.moduleId, b.name.trim(), b.status || 'not-started', b.priority || 'medium', (b.notes || '').trim(), new Date().toISOString()
  );
  return NextResponse.json(await db.prepare('SELECT * FROM planner_topics WHERE id = ?').get(id), { status: 201 });
}

// PATCH /api/planner/topics — { id, status?/name?/priority?/notes? }
export async function PATCH(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const b = await request.json();
  const db = await getDb();
  const t = await db.prepare('SELECT * FROM planner_topics WHERE id = ?').get(b.id) as any;
  if (!t) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  if (t.userId !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  await db.prepare('UPDATE planner_topics SET name = ?, status = ?, priority = ?, notes = ? WHERE id = ?').run(
    (b.name ?? t.name).trim() || t.name, b.status ?? t.status, b.priority ?? t.priority, (b.notes ?? t.notes) || '', b.id
  );
  return NextResponse.json({ success: true });
}

// DELETE /api/planner/topics?id=
export async function DELETE(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const db = await getDb();
  const t = await db.prepare('SELECT userId FROM planner_topics WHERE id = ?').get(id) as any;
  if (!t) return NextResponse.json({ success: true });
  if (t.userId !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  await db.prepare('DELETE FROM planner_topics WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
