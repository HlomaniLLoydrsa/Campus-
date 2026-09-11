import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';

// GET /api/planner/modules — the authenticated user's modules (with quick counts).
export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const db = await getDb();
  const mods = await db.prepare('SELECT * FROM planner_modules WHERE userId = ? AND archived = 0 ORDER BY createdAt DESC').all(userId) as any[];
  const out = [];
  for (const m of mods) {
    const t = await db.prepare("SELECT COUNT(*) as c FROM planner_tasks WHERE moduleId = ? AND status != 'completed' AND status != 'cancelled'").get(m.id) as any;
    const topics = await db.prepare('SELECT status FROM planner_topics WHERE moduleId = ?').all(m.id) as any[];
    const mastered = topics.filter(x => x.status === 'mastered').length;
    out.push({ ...m, openTasks: t?.c || 0, topicCount: topics.length, masteredTopics: mastered });
  }
  return NextResponse.json(out);
}

// POST /api/planner/modules — create a module.
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const body = await request.json();
  if (!body.name?.trim()) return NextResponse.json({ error: 'Module name is required' }, { status: 400 });
  const db = await getDb();
  const id = `mod_${crypto.randomUUID().slice(0, 8)}`;
  await db.prepare('INSERT INTO planner_modules (id, userId, semesterId, code, name, color, archived, createdAt) VALUES (?, ?, ?, ?, ?, ?, 0, ?)').run(
    id, userId, body.semesterId || null, (body.code || '').trim(), body.name.trim(), body.color || '#1A3F75', new Date().toISOString()
  );
  const created = await db.prepare('SELECT * FROM planner_modules WHERE id = ?').get(id);
  return NextResponse.json({ ...created, openTasks: 0, topicCount: 0, masteredTopics: 0 }, { status: 201 });
}
