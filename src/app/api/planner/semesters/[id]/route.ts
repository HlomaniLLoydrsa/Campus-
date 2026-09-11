import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

async function owned(db: any, id: string, userId: string) {
  const s = await db.prepare('SELECT * FROM planner_semesters WHERE id = ?').get(id) as any;
  if (!s) return { err: NextResponse.json({ error: 'Semester not found' }, { status: 404 }) };
  if (s.userId !== userId) return { err: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) };
  return { s };
}

// PATCH /api/planner/semesters/:id — edit or set active.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const db = await getDb();
  const { s, err } = await owned(db, id, userId);
  if (err) return err;
  const b = await request.json();

  if (b.action === 'activate') {
    await db.prepare('UPDATE planner_semesters SET active = 0 WHERE userId = ?').run(userId);
    await db.prepare('UPDATE planner_semesters SET active = 1 WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  }
  await db.prepare('UPDATE planner_semesters SET name = ?, startDate = ?, endDate = ? WHERE id = ?').run(
    (b.name ?? s.name).trim() || s.name, (b.startDate ?? s.startDate) || '', (b.endDate ?? s.endDate) || '', id
  );
  return NextResponse.json({ success: true });
}

// DELETE /api/planner/semesters/:id — delete the semester (modules keep working; their semesterId is cleared).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const db = await getDb();
  const { err } = await owned(db, id, userId);
  if (err) return err;
  await db.prepare('DELETE FROM planner_semesters WHERE id = ?').run(id);
  await db.prepare('UPDATE planner_modules SET semesterId = NULL WHERE semesterId = ?').run(id);
  return NextResponse.json({ success: true });
}
