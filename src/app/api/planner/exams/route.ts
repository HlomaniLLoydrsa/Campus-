import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { examPrepProgress } from '@/lib/planner';

const PREP_TYPES = ['exam', 'test', 'quiz'];

// GET /api/planner/exams — the user's assessment tasks (exam/test/quiz) with prep summaries.
// ?scope=upcoming (default) | all
export async function GET(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope') || 'upcoming';
  const db = await getDb();

  const placeholders = PREP_TYPES.map(() => '?').join(',');
  const tasks = await db.prepare(
    `SELECT * FROM planner_tasks WHERE userId = ? AND type IN (${placeholders}) AND status != 'cancelled' ORDER BY dueDate ASC, createdAt DESC`
  ).all(userId, ...PREP_TYPES) as any[];

  const todayStr = new Date().toISOString().slice(0, 10);
  const modules = await db.prepare('SELECT id, code, name, color FROM planner_modules WHERE userId = ?').all(userId) as any[];
  const modMap: Record<string, any> = {}; modules.forEach(m => { modMap[m.id] = m; });

  const out = [];
  for (const t of tasks) {
    if (scope === 'upcoming' && t.status === 'completed') continue;
    const topicIds: string[] = JSON.parse(t.topicIds || '[]');
    let topics: any[] = [];
    if (topicIds.length) {
      const ph = topicIds.map(() => '?').join(',');
      topics = await db.prepare(`SELECT id, name, status FROM planner_topics WHERE id IN (${ph})`).all(...topicIds) as any[];
    }
    const sessions = await db.prepare("SELECT id, status FROM planner_sessions WHERE taskId = ?").all(t.id) as any[];
    const doneSessions = sessions.filter(s => s.status === 'completed').length;
    out.push({
      ...t,
      topicIds,
      module: t.moduleId ? modMap[t.moduleId] || null : null,
      topicCount: topics.length,
      masteredCount: topics.filter(x => x.status === 'mastered').length,
      prepProgress: examPrepProgress(topics, t.progress || 0),
      sessionCount: sessions.length,
      completedSessions: doneSessions,
    });
  }
  return NextResponse.json(out);
}
