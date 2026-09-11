import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

async function owned(db: any, id: string, userId: string) {
  const t = await db.prepare('SELECT * FROM planner_tasks WHERE id = ?').get(id) as any;
  if (!t) return { err: NextResponse.json({ error: 'Task not found' }, { status: 404 }) };
  if (t.userId !== userId) return { err: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) };
  return { t };
}

// GET /api/planner/tasks/:id — task + related study sessions.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const db = await getDb();
  const { t, err } = await owned(db, id, auth);
  if (err) return err;
  const sessions = await db.prepare('SELECT * FROM planner_sessions WHERE taskId = ? ORDER BY date ASC').all(id) as any[];
  let mod: any = null;
  if (t.moduleId) mod = await db.prepare('SELECT id, code, name, color FROM planner_modules WHERE id = ?').get(t.moduleId);
  let resource: any = null;
  if (t.resourceId) resource = await db.prepare('SELECT id, title, type, module, fileType FROM academy_resources WHERE id = ?').get(t.resourceId);
  return NextResponse.json({ ...t, topicIds: JSON.parse(t.topicIds || '[]'), sessions, module: mod, resource });
}

// PATCH /api/planner/tasks/:id — edit / complete / reopen / progress / pin.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const db = await getDb();
  const { t, err } = await owned(db, id, auth);
  if (err) return err;
  const b = await request.json();

  if (b.action === 'complete') { await db.prepare('UPDATE planner_tasks SET status = ?, progress = 100 WHERE id = ?').run('completed', id); return NextResponse.json({ success: true }); }
  if (b.action === 'reopen') { await db.prepare('UPDATE planner_tasks SET status = ? WHERE id = ?').run('in-progress', id); return NextResponse.json({ success: true }); }
  if (b.action === 'pin') { await db.prepare('UPDATE planner_tasks SET pinned = ? WHERE id = ?').run(t.pinned ? 0 : 1, id); return NextResponse.json({ pinned: !t.pinned }); }
  if (b.action === 'progress') { await db.prepare('UPDATE planner_tasks SET progress = ?, status = ? WHERE id = ?').run(Math.max(0, Math.min(100, Number(b.progress) || 0)), (Number(b.progress) >= 100 ? 'completed' : 'in-progress'), id); return NextResponse.json({ success: true }); }

  // Full edit
  await db.prepare(
    `UPDATE planner_tasks SET moduleId=?, title=?, type=?, description=?, dueDate=?, dueTime=?, priority=?, status=?, progress=?, estimatedHours=?, topicIds=?, notes=? WHERE id=?`
  ).run(
    b.moduleId ?? t.moduleId, (b.title ?? t.title).trim() || t.title, b.type ?? t.type, (b.description ?? t.description) || '',
    (b.dueDate ?? t.dueDate) || '', (b.dueTime ?? t.dueTime) || '', b.priority ?? t.priority, b.status ?? t.status,
    b.progress != null ? Number(b.progress) : t.progress, b.estimatedHours != null ? Number(b.estimatedHours) : t.estimatedHours,
    JSON.stringify(Array.isArray(b.topicIds) ? b.topicIds : JSON.parse(t.topicIds || '[]')), (b.notes ?? t.notes) || '', id
  );
  const updated = await db.prepare('SELECT * FROM planner_tasks WHERE id = ?').get(id) as any;
  return NextResponse.json({ ...updated, topicIds: JSON.parse(updated.topicIds || '[]') });
}

// DELETE /api/planner/tasks/:id
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const db = await getDb();
  const { err } = await owned(db, id, auth);
  if (err) return err;
  await db.prepare('DELETE FROM planner_tasks WHERE id = ?').run(id);
  await db.prepare('UPDATE planner_sessions SET taskId = NULL WHERE taskId = ?').run(id);
  return NextResponse.json({ success: true });
}
