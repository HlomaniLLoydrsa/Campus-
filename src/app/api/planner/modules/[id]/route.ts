import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

async function owned(db: any, id: string, userId: string) {
  const m = await db.prepare('SELECT * FROM planner_modules WHERE id = ?').get(id) as any;
  if (!m) return { err: NextResponse.json({ error: 'Module not found' }, { status: 404 }) };
  if (m.userId !== userId) return { err: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) };
  return { m };
}

// GET /api/planner/modules/:id — module + its tasks, topics, sessions.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const db = await getDb();
  const { m, err } = await owned(db, id, auth);
  if (err) return err;
  const tasks = await db.prepare('SELECT * FROM planner_tasks WHERE moduleId = ? ORDER BY dueDate ASC').all(id) as any[];
  const topics = await db.prepare('SELECT * FROM planner_topics WHERE moduleId = ? ORDER BY createdAt ASC').all(id) as any[];
  const sessions = await db.prepare('SELECT * FROM planner_sessions WHERE moduleId = ? ORDER BY date ASC').all(id) as any[];
  return NextResponse.json({
    ...m,
    tasks: tasks.map(t => ({ ...t, topicIds: JSON.parse(t.topicIds || '[]') })),
    topics, sessions,
  });
}

// PATCH /api/planner/modules/:id — edit / archive.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const db = await getDb();
  const { m, err } = await owned(db, id, auth);
  if (err) return err;
  const body = await request.json();
  if (body.action === 'archive') { await db.prepare('UPDATE planner_modules SET archived = 1 WHERE id = ?').run(id); return NextResponse.json({ success: true }); }
  await db.prepare('UPDATE planner_modules SET code = ?, name = ?, color = ? WHERE id = ?').run(
    (body.code ?? m.code) || '', (body.name ?? m.name).trim() || m.name, body.color ?? m.color, id
  );
  return NextResponse.json({ success: true });
}

// DELETE /api/planner/modules/:id — delete module + its planner children.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const db = await getDb();
  const { err } = await owned(db, id, auth);
  if (err) return err;
  await db.prepare('DELETE FROM planner_modules WHERE id = ?').run(id);
  await db.prepare('DELETE FROM planner_topics WHERE moduleId = ?').run(id);
  await db.prepare('DELETE FROM planner_tasks WHERE moduleId = ?').run(id);
  await db.prepare('DELETE FROM planner_sessions WHERE moduleId = ?').run(id);
  return NextResponse.json({ success: true });
}
