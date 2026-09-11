import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { workloadLabel, progressLabel, examPrepProgress } from '@/lib/planner';

// GET /api/planner/overview — "My Semester": per-module progress + gentle workload/progress analytics.
export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const db = await getDb();

  const activeSemester = await db.prepare('SELECT * FROM planner_semesters WHERE userId = ? AND active = 1 LIMIT 1').get(userId) as any;

  const modules = await db.prepare('SELECT * FROM planner_modules WHERE userId = ? AND archived = 0 ORDER BY createdAt ASC').all(userId) as any[];

  const perModule = [];
  let totalTasks = 0, totalCompleted = 0;
  for (const m of modules) {
    const tasks = await db.prepare("SELECT status FROM planner_tasks WHERE moduleId = ? AND status != 'cancelled'").all(m.id) as any[];
    const topics = await db.prepare('SELECT status FROM planner_topics WHERE moduleId = ?').all(m.id) as any[];
    const completed = tasks.filter(t => t.status === 'completed').length;
    const open = tasks.length - completed;
    const taskProgress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
    const topicProgress = examPrepProgress(topics as any[], 0); // reuse readiness weighting for topic mastery
    // Blend task completion + topic mastery for an overall module progress feel.
    const overall = topics.length && tasks.length ? Math.round((taskProgress + topicProgress) / 2)
      : tasks.length ? taskProgress : topicProgress;
    totalTasks += tasks.length; totalCompleted += completed;
    perModule.push({
      id: m.id, code: m.code, name: m.name, color: m.color,
      taskCount: tasks.length, openTasks: open, completedTasks: completed,
      topicCount: topics.length, masteredTopics: topics.filter(t => t.status === 'mastered').length,
      taskProgress, topicProgress, overall, progressLabel: progressLabel(overall),
    });
  }

  // This week's planned study hours (gentle workload signal).
  const todayStr = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);
  const weekSessions = await db.prepare("SELECT durationMin FROM planner_sessions WHERE userId = ? AND status = 'planned' AND date >= ? AND date <= ?").all(userId, todayStr, weekEndStr) as any[];
  const weekMinutes = weekSessions.reduce((s, x) => s + (x.durationMin || 0), 0);
  const weekHours = Math.round((weekMinutes / 60) * 10) / 10;

  const overallProgress = totalTasks ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  return NextResponse.json({
    semester: activeSemester || null,
    modules: perModule,
    summary: {
      moduleCount: modules.length,
      totalTasks, totalCompleted,
      overallProgress,
      overallProgressLabel: progressLabel(overallProgress),
      weekHours,
      workload: workloadLabel(weekHours),
    },
  });
}
