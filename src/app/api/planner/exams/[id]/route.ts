import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { examPrepProgress } from '@/lib/planner';

async function owned(db: any, id: string, userId: string) {
  const t = await db.prepare('SELECT * FROM planner_tasks WHERE id = ?').get(id) as any;
  if (!t) return { err: NextResponse.json({ error: 'Exam not found' }, { status: 404 }) };
  if (t.userId !== userId) return { err: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) };
  return { t };
}

// GET /api/planner/exams/:id — full prep centre payload for one assessment task.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const db = await getDb();
  const { t, err } = await owned(db, id, auth);
  if (err) return err;

  const topicIds: string[] = JSON.parse(t.topicIds || '[]');
  let attachedTopics: any[] = [];
  if (topicIds.length) {
    const ph = topicIds.map(() => '?').join(',');
    attachedTopics = await db.prepare(`SELECT * FROM planner_topics WHERE id IN (${ph})`).all(...topicIds) as any[];
  }

  // All topics for the module (so the user can attach more).
  let moduleTopics: any[] = [];
  let mod: any = null;
  if (t.moduleId) {
    mod = await db.prepare('SELECT id, code, name, color FROM planner_modules WHERE id = ?').get(t.moduleId);
    moduleTopics = await db.prepare('SELECT * FROM planner_topics WHERE moduleId = ? ORDER BY createdAt ASC').all(t.moduleId) as any[];
  }

  const sessions = await db.prepare('SELECT * FROM planner_sessions WHERE taskId = ? ORDER BY date ASC, startTime ASC').all(id) as any[];

  return NextResponse.json({
    ...t,
    topicIds,
    module: mod,
    attachedTopics,
    moduleTopics,
    sessions,
    prepProgress: examPrepProgress(attachedTopics, t.progress || 0),
    revisionDone: sessions.filter(s => s.status === 'completed').length,
    revisionPlanned: sessions.filter(s => s.status === 'planned').length,
  });
}

// PATCH /api/planner/exams/:id — attach/detach topics or set prep notes.
// Body: { action: 'attachTopic'|'detachTopic', topicId } OR { action: 'setTopics', topicIds: [] }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const db = await getDb();
  const { t, err } = await owned(db, id, auth);
  if (err) return err;
  const b = await request.json();

  const current: string[] = JSON.parse(t.topicIds || '[]');

  const verifyTopic = async (topicId: string) => {
    const tp = await db.prepare('SELECT userId FROM planner_topics WHERE id = ?').get(topicId) as any;
    return tp && tp.userId === userId;
  };

  let next = current;
  if (b.action === 'attachTopic') {
    if (!b.topicId || !(await verifyTopic(b.topicId))) return NextResponse.json({ error: 'Invalid topic' }, { status: 400 });
    next = current.includes(b.topicId) ? current : [...current, b.topicId];
  } else if (b.action === 'detachTopic') {
    next = current.filter(x => x !== b.topicId);
  } else if (b.action === 'setTopics') {
    const ids: string[] = Array.isArray(b.topicIds) ? b.topicIds : [];
    for (const tid of ids) { if (!(await verifyTopic(tid))) return NextResponse.json({ error: 'Invalid topic' }, { status: 400 }); }
    next = ids;
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  await db.prepare('UPDATE planner_tasks SET topicIds = ? WHERE id = ?').run(JSON.stringify(next), id);
  return NextResponse.json({ topicIds: next });
}
