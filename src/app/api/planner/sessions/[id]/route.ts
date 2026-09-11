import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

async function owned(db: any, id: string, userId: string) {
  const s = await db.prepare('SELECT * FROM planner_sessions WHERE id = ?').get(id) as any;
  if (!s) return { err: NextResponse.json({ error: 'Session not found' }, { status: 404 }) };
  if (s.userId !== userId) return { err: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) };
  return { s };
}

// GET /api/planner/sessions/:id
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const db = await getDb();
  const { s, err } = await owned(db, id, auth);
  if (err) return err;
  return NextResponse.json(s);
}

// PATCH /api/planner/sessions/:id — complete | partial | skip | reschedule | edit
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const db = await getDb();
  const { s, err } = await owned(db, id, auth);
  if (err) return err;
  const b = await request.json();

  if (b.action === 'complete') {
    await db.prepare('UPDATE planner_sessions SET status = ?, actualMin = ?, reflection = ? WHERE id = ?').run(
      'completed', Number(b.actualMin) || s.durationMin, (b.reflection || '').trim(), id
    );
    return NextResponse.json({ success: true });
  }
  if (b.action === 'partial') {
    await db.prepare('UPDATE planner_sessions SET status = ?, actualMin = ?, reflection = ? WHERE id = ?').run(
      'partial', Number(b.actualMin) || 0, (b.reflection || '').trim(), id
    );
    return NextResponse.json({ success: true });
  }
  if (b.action === 'skip') {
    await db.prepare('UPDATE planner_sessions SET status = ? WHERE id = ?').run('skipped', id);
    return NextResponse.json({ success: true });
  }
  if (b.action === 'reschedule') {
    await db.prepare('UPDATE planner_sessions SET date = ?, startTime = ?, endTime = ?, status = ? WHERE id = ?').run(
      (b.date || s.date), (b.startTime ?? s.startTime), (b.endTime ?? s.endTime), 'planned', id
    );
    return NextResponse.json({ success: true });
  }
  // Full edit
  await db.prepare('UPDATE planner_sessions SET title = ?, moduleId = ?, topicId = ?, taskId = ?, date = ?, startTime = ?, endTime = ?, durationMin = ?, goal = ? WHERE id = ?').run(
    (b.title ?? s.title).trim() || s.title, b.moduleId ?? s.moduleId, b.topicId ?? s.topicId, b.taskId ?? s.taskId,
    (b.date ?? s.date) || '', (b.startTime ?? s.startTime) || '', (b.endTime ?? s.endTime) || '',
    b.durationMin != null ? Number(b.durationMin) : s.durationMin, (b.goal ?? s.goal) || '', id
  );
  return NextResponse.json({ success: true });
}

// DELETE /api/planner/sessions/:id
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const db = await getDb();
  const { err } = await owned(db, id, auth);
  if (err) return err;
  await db.prepare('DELETE FROM planner_sessions WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
