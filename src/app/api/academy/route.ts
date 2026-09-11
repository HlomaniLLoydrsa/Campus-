import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId, getSessionUserId } from '@/lib/auth';

const RESOURCE_TYPES = ['past-paper', 'test', 'assignment', 'notes', 'summary', 'study-guide', 'flashcards', 'tutorial', 'other'];

// GET /api/academy — list/search/filter academy resources.
// Query params: q, type, course, module, institution, faculty, year, semester,
//               sort=recent|downloads|rating, saved=1 (my saved), mine=1 (my uploads)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const db = await getDb();
  const sessionUserId = await getSessionUserId();

  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const type = searchParams.get('type');
  const course = searchParams.get('course');
  const module = searchParams.get('module');
  const institution = searchParams.get('institution');
  const sort = searchParams.get('sort') || 'recent';
  const savedOnly = searchParams.get('saved') === '1';
  const mineOnly = searchParams.get('mine') === '1';

  const where: string[] = [];
  const args: any[] = [];
  if (type) { where.push('type = ?'); args.push(type); }
  if (course) { where.push('LOWER(course) = ?'); args.push(course.toLowerCase()); }
  if (module) { where.push('LOWER(module) = ?'); args.push(module.toLowerCase()); }
  if (institution) { where.push('LOWER(institution) = ?'); args.push(institution.toLowerCase()); }
  if (mineOnly && sessionUserId) { where.push('uploaderId = ?'); args.push(sessionUserId); }
  if (savedOnly && sessionUserId) {
    where.push('id IN (SELECT resourceId FROM academy_saves WHERE userId = ?)');
    args.push(sessionUserId);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  let rows = await db.prepare(`SELECT * FROM academy_resources ${whereSql}`).all(...args) as any[];

  // Text search across title/module/course/description (in-memory keeps SQL simple + portable)
  if (q) {
    rows = rows.filter(r =>
      (r.title || '').toLowerCase().includes(q) ||
      (r.module || '').toLowerCase().includes(q) ||
      (r.course || '').toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q)
    );
  }

  // Attach rating aggregates + save/rating state for the caller
  const result = [];
  for (const r of rows) {
    const agg = await db.prepare('SELECT COUNT(*) as c, AVG(rating) as avg FROM academy_ratings WHERE resourceId = ?').get(r.id) as any;
    const ratingCount = agg?.c || 0;
    const ratingAvg = agg?.avg ? Math.round(agg.avg * 10) / 10 : 0;
    let saved = false;
    if (sessionUserId) {
      const s = await db.prepare('SELECT 1 FROM academy_saves WHERE resourceId = ? AND userId = ?').get(r.id, sessionUserId);
      saved = !!s;
    }
    result.push({ ...r, ratingCount, ratingAvg, saved });
  }

  // Sort
  if (sort === 'downloads') result.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
  else if (sort === 'rating') result.sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount);
  else result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(result);
}

// POST /api/academy — upload a resource (the uploader is the authenticated user).
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const uploaderId = auth;

  const body = await request.json();
  const { title, type, institution, faculty, course, module, year, semester, description, fileUrl, fileType, fileSize } = body;

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  if (!fileUrl) return NextResponse.json({ error: 'A file is required' }, { status: 400 });
  const resType = RESOURCE_TYPES.includes(type) ? type : 'other';

  const db = await getDb();
  const id = `res_${crypto.randomUUID().slice(0, 8)}`;
  await db.prepare(
    `INSERT INTO academy_resources (id, uploaderId, title, type, institution, faculty, course, module, year, semester, description, fileUrl, fileType, fileSize, downloads)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(
    id, uploaderId, title.trim(), resType,
    (institution || '').trim(), (faculty || '').trim(), (course || '').trim(), (module || '').trim(),
    (year || '').toString().trim(), (semester || '').toString().trim(), (description || '').trim(),
    fileUrl, fileType || '', Number(fileSize) || 0
  );

  const created = await db.prepare('SELECT * FROM academy_resources WHERE id = ?').get(id);
  return NextResponse.json({ ...created, ratingCount: 0, ratingAvg: 0, saved: false }, { status: 201 });
}
