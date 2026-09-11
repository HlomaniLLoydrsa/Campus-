// Shared VYBE Planner types + constants (client + server safe).

export interface PlannerModule {
  id: string; userId: string; semesterId?: string | null;
  code: string; name: string; color: string; archived: number; createdAt: string;
}

export interface PlannerTopic {
  id: string; userId: string; moduleId: string; name: string;
  status: TopicStatus; priority: string; notes: string; createdAt: string;
}

export interface PlannerTask {
  id: string; userId: string; moduleId?: string | null; title: string; type: TaskType;
  description: string; dueDate: string; dueTime: string; priority: Priority; status: TaskStatus;
  progress: number; estimatedHours: number; topicIds: string[]; notes: string; pinned: number; createdAt: string;
}

export interface PlannerSession {
  id: string; userId: string; moduleId?: string | null; topicId?: string | null; taskId?: string | null;
  planId?: string | null; title: string; date: string; startTime: string; endTime: string;
  durationMin: number; goal: string; status: SessionStatus; actualMin: number; reflection: string;
  resourceId?: string | null; createdAt: string;
}

export type TaskType = 'assignment' | 'test' | 'exam' | 'project' | 'presentation' | 'quiz' | 'practical' | 'reading' | 'research' | 'other';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'not-started' | 'in-progress' | 'completed' | 'cancelled';
export type TopicStatus = 'not-started' | 'learning' | 'revising' | 'confident' | 'mastered';
export type SessionStatus = 'planned' | 'completed' | 'partial' | 'skipped';

export const TASK_TYPES: { value: TaskType; label: string; emoji: string }[] = [
  { value: 'assignment', label: 'Assignment', emoji: '📝' },
  { value: 'test', label: 'Test', emoji: '🧪' },
  { value: 'exam', label: 'Exam', emoji: '🎯' },
  { value: 'project', label: 'Project', emoji: '📦' },
  { value: 'presentation', label: 'Presentation', emoji: '📊' },
  { value: 'quiz', label: 'Quiz', emoji: '❓' },
  { value: 'practical', label: 'Practical', emoji: '🔬' },
  { value: 'reading', label: 'Reading', emoji: '📖' },
  { value: 'research', label: 'Research', emoji: '🔎' },
  { value: 'other', label: 'Other', emoji: '📌' },
];

export const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-600' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

export const TOPIC_STATUSES: { value: TopicStatus; label: string; color: string }[] = [
  { value: 'not-started', label: 'Not started', color: 'bg-gray-100 text-gray-500' },
  { value: 'learning', label: 'Learning', color: 'bg-blue-100 text-blue-700' },
  { value: 'revising', label: 'Revising', color: 'bg-amber-100 text-amber-700' },
  { value: 'confident', label: 'Confident', color: 'bg-teal-100 text-teal-700' },
  { value: 'mastered', label: 'Mastered', color: 'bg-green-100 text-green-700' },
];

// Self-reported readiness weight per topic status (0..1). Used for exam prep progress.
export const TOPIC_READINESS: Record<TopicStatus, number> = {
  'not-started': 0,
  'learning': 0.25,
  'revising': 0.5,
  'confident': 0.8,
  'mastered': 1,
};

/** Exam prep progress (0..100) from associated topics' self-reported readiness.
 *  Falls back to the task's own progress when there are no linked topics. */
export function examPrepProgress(topics: { status: TopicStatus }[], fallbackProgress = 0): number {
  if (!topics.length) return Math.max(0, Math.min(100, Math.round(fallbackProgress)));
  const total = topics.reduce((sum, t) => sum + (TOPIC_READINESS[t.status] ?? 0), 0);
  return Math.round((total / topics.length) * 100);
}

// Non-stressful workload label from planned study hours in a week.
// Deliberately gentle — never alarming, never guilt-inducing.
export function workloadLabel(hours: number): { label: string; tone: 'calm' | 'steady' | 'full' } {
  if (hours <= 0) return { label: 'Open week', tone: 'calm' };
  if (hours < 6) return { label: 'Light and manageable', tone: 'calm' };
  if (hours < 14) return { label: 'A steady rhythm', tone: 'steady' };
  return { label: 'A full week — pace yourself', tone: 'full' };
}

// Encouraging progress label from a 0..100 percentage.
export function progressLabel(pct: number): string {
  if (pct >= 90) return 'Nearly there';
  if (pct >= 60) return 'Good momentum';
  if (pct >= 30) return 'Getting into it';
  if (pct > 0) return 'Just started';
  return 'Ready when you are';
}

export function taskTypeMeta(v: string) { return TASK_TYPES.find(t => t.value === v) || TASK_TYPES[TASK_TYPES.length - 1]; }
export function priorityMeta(v: string) { return PRIORITIES.find(p => p.value === v) || PRIORITIES[1]; }
export function topicStatusMeta(v: string) { return TOPIC_STATUSES.find(s => s.value === v) || TOPIC_STATUSES[0]; }

/** Combine a due date (YYYY-MM-DD) + optional time (HH:MM) into a Date (local). */
export function dueDateTime(dueDate: string, dueTime?: string): Date | null {
  if (!dueDate) return null;
  const t = dueTime && /^\d{2}:\d{2}/.test(dueTime) ? dueTime : '23:59';
  const d = new Date(`${dueDate}T${t}`);
  return isNaN(d.getTime()) ? null : d;
}

/** Human countdown string. Never shows negative time incorrectly. */
export function countdown(dueDate: string, dueTime?: string): { label: string; overdue: boolean; soon: boolean } {
  const d = dueDateTime(dueDate, dueTime);
  if (!d) return { label: '', overdue: false, soon: false };
  const now = new Date();
  const ms = d.getTime() - now.getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 0) {
    const overdueMin = -mins;
    const days = Math.floor(overdueMin / 1440);
    if (days >= 1) return { label: `Overdue by ${days} day${days > 1 ? 's' : ''}`, overdue: true, soon: false };
    const hrs = Math.floor(overdueMin / 60);
    if (hrs >= 1) return { label: `Overdue by ${hrs}h`, overdue: true, soon: false };
    return { label: 'Overdue', overdue: true, soon: false };
  }
  const days = Math.floor(mins / 1440);
  const hrs = Math.floor((mins % 1440) / 60);
  if (days === 0 && hrs === 0) return { label: `Due in ${mins}m`, overdue: false, soon: true };
  if (days === 0) return { label: `Due today · ${hrs}h left`, overdue: false, soon: true };
  if (days === 1) return { label: `Due tomorrow`, overdue: false, soon: true };
  if (days <= 3) return { label: `${days} days, ${hrs}h left`, overdue: false, soon: true };
  return { label: `${days} days remaining`, overdue: false, soon: false };
}
