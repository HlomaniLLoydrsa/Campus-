import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';

// GET /api/planner/semesters — the user's semesters (active first).
export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const db = await getDb();
  const rows = await db.prepare('SELECT * FROM planner_semesters WHERE userId = ? ORDER BY active DESC, createdAt DESC').all(userId) as any[];
  return NextResponse.json(rows);
}

// POST /api/planner/semesters — create a semester (becomes active; others deactivated).
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const b = await request.json();
  if (!b.name?.trim()) return NextResponse.json({ error: 'Semester name is required' }, { status: 400 });
  const db = await getDb();
  const id = `sem_${crypto.randomUUID().slice(0, 8)}`;
  const makeActive = b.active !== false;
  if (makeActive) await db.prepare('UPDATE planner_semesters SET active = 0 WHERE userId = ?').run(userId);
  await db.prepare('INSERT INTO planner_semesters (id, userId, name, startDate, endDate, active, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, userId, b.name.trim(), (b.startDate || '').trim(), (b.endDate || '').trim(), makeActive ? 1 : 0, new Date().toISOString()
  );
  return NextResponse.json(await db.prepare('SELECT * FROM planner_semesters WHERE id = ?').get(id), { status: 201 });
}
