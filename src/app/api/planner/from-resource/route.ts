import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';

// POST /api/planner/from-resource — add an Academy resource to the user's Planner.
// Stores a REFERENCE (resourceId) — never copies the resource's content.
// Body: { resourceId, as: 'task' | 'session', dueDate?, dueTime?, date?, startTime?, durationMin?, type?, moduleId? }
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const b = await request.json();
  if (!b.resourceId) return NextResponse.json({ error: 'resourceId is required' }, { status: 400 });

  const db = await getDb();
  const res = await db.prepare('SELECT id, title, module, course, type FROM academy_resources WHERE id = ?').get(b.resourceId) as any;
  if (!res) return NextResponse.json({ error: 'Resource not found' }, { status: 404 });

  // Resolve a module: explicit one (verify ownership) or best-effort match by the resource's module/course code.
  let moduleId: string | null = null;
  if (b.moduleId) {
    const m = await db.prepare('SELECT id, userId FROM planner_modules WHERE id = ?').get(b.moduleId) as any;
    if (!m || m.userId !== userId) return NextResponse.json({ error: 'Not authorized for that module' }, { status: 403 });
    moduleId = m.id;
  } else {
    const codeGuess = (res.module || res.course || '').trim();
    if (codeGuess) {
      const match = await db.prepare('SELECT id FROM planner_modules WHERE userId = ? AND archived = 0 AND (LOWER(code) = LOWER(?) OR LOWER(name) = LOWER(?)) LIMIT 1').get(userId, codeGuess, codeGuess) as any;
      if (match) moduleId = match.id;
    }
  }

  const now = new Date().toISOString();

  if (b.as === 'session') {
    const id = `pss_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare(
      `INSERT INTO planner_sessions (id, userId, moduleId, topicId, taskId, planId, title, date, startTime, endTime, durationMin, goal, status, actualMin, reflection, resourceId, createdAt)
       VALUES (?, ?, ?, NULL, NULL, NULL, ?, ?, ?, '', ?, ?, 'planned', 0, '', ?, ?)`
    ).run(
      id, userId, moduleId, `Study: ${res.title}`.slice(0, 120),
      (b.date || '').trim(), (b.startTime || '').trim(), Number(b.durationMin) || 60,
      `Work through "${res.title}"`.slice(0, 200), res.id, now
    );
    return NextResponse.json({ kind: 'session', id, moduleMatched: !!moduleId }, { status: 201 });
  }

  // Default: create a task that references the resource.
  const id = `ptk_${crypto.randomUUID().slice(0, 8)}`;
  const title = b.title?.trim() || res.title;
  await db.prepare(
    `INSERT INTO planner_tasks (id, userId, moduleId, title, type, description, dueDate, dueTime, priority, status, progress, estimatedHours, topicIds, notes, pinned, resourceId, createdAt)
     VALUES (?, ?, ?, ?, ?, '', ?, ?, 'medium', 'not-started', 0, 0, '[]', ?, 0, ?, ?)`
  ).run(
    id, userId, moduleId, title.slice(0, 160), b.type || 'reading',
    (b.dueDate || '').trim(), (b.dueTime || '').trim(),
    `From Academy resource: ${res.title}`.slice(0, 300), res.id, now
  );
  return NextResponse.json({ kind: 'task', id, moduleMatched: !!moduleId }, { status: 201 });
}
