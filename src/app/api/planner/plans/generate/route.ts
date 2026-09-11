import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';

// POST /api/planner/plans/generate — preview a distributed study plan (NO DB write).
// Body: {
//   targetDate: 'YYYY-MM-DD',       // exam/deadline; sessions land strictly before this (or on the day before)
//   startDate?: 'YYYY-MM-DD',       // default: today
//   weekdays: number[],             // 0=Sun..6=Sat — days the student is available
//   startTime?: 'HH:MM',            // default 16:00
//   durationMin?: number,           // default 60
//   maxSessions?: number,           // cap total sessions
//   topics?: [{ id, name }],        // optional — one session cycles through topics
// }
// Returns { sessions: [{ date, startTime, endTime, durationMin, title, topicId }] }
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const b = await request.json();

  const target = parseYmd(b.targetDate);
  if (!target) return NextResponse.json({ error: 'A valid target date is required' }, { status: 400 });

  const today = startOfDay(new Date());
  let start = parseYmd(b.startDate) || today;
  if (start < today) start = today;

  // Sessions must land before the target day (leave the target day for the exam itself).
  const lastDay = addDays(target, -1);
  if (lastDay < start) return NextResponse.json({ error: 'Target date is too soon — no days available before it' }, { status: 400 });

  const weekdays: number[] = Array.isArray(b.weekdays) && b.weekdays.length
    ? b.weekdays.map((n: any) => Number(n)).filter((n: number) => n >= 0 && n <= 6)
    : [1, 2, 3, 4, 5]; // default Mon–Fri
  const wdSet = new Set(weekdays);

  const startTime = /^\d{2}:\d{2}$/.test(b.startTime) ? b.startTime : '16:00';
  const durationMin = Number(b.durationMin) > 0 ? Number(b.durationMin) : 60;
  const maxSessions = Number(b.maxSessions) > 0 ? Number(b.maxSessions) : 0;
  const topics: { id: string; name: string }[] = Array.isArray(b.topics) ? b.topics : [];

  // Collect available dates.
  const dates: Date[] = [];
  for (let d = new Date(start); d <= lastDay; d = addDays(d, 1)) {
    if (wdSet.has(d.getDay())) dates.push(new Date(d));
  }
  if (!dates.length) return NextResponse.json({ error: 'No available days match your selected weekdays before the target date' }, { status: 400 });

  const limited = maxSessions > 0 ? dates.slice(0, maxSessions) : dates;
  const endTime = addMinutesToTime(startTime, durationMin);

  const sessions = limited.map((d, i) => {
    const topic = topics.length ? topics[i % topics.length] : null;
    return {
      date: ymd(d),
      startTime,
      endTime,
      durationMin,
      topicId: topic?.id || null,
      title: topic?.name ? `Study: ${topic.name}` : 'Study session',
    };
  });

  return NextResponse.json({
    sessions,
    availableDays: dates.length,
    generated: sessions.length,
  });
}

function parseYmd(s: any): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function addMinutesToTime(t: string, min: number): string {
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + min;
  const hh = Math.floor((total % 1440) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
