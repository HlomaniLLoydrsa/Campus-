import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId, getSessionUserId } from '@/lib/auth';

const CATEGORIES = ['tutoring', 'design', 'web', 'photography', 'video', 'beauty', 'music', 'repairs', 'printing', 'writing', 'tech', 'fitness', 'other'];

async function decorate(db: any, rows: any[], sessionUserId: string | null) {
  const out = [];
  for (const r of rows) {
    const agg = await db.prepare('SELECT COUNT(*) as c, AVG(rating) as avg FROM service_reviews WHERE serviceId = ?').get(r.id) as any;
    const rc = await db.prepare('SELECT COUNT(*) as c FROM service_requests WHERE serviceId = ?').get(r.id) as any;
    let saved = false;
    if (sessionUserId) saved = !!(await db.prepare('SELECT 1 FROM service_saves WHERE serviceId = ? AND userId = ?').get(r.id, sessionUserId));
    out.push({
      ...r,
      portfolio: JSON.parse(r.portfolio || '[]'),
      ratingCount: agg?.c || 0,
      ratingAvg: agg?.avg ? Math.round(agg.avg * 10) / 10 : 0,
      requestCount: rc?.c || 0,
      saved,
    });
  }
  return out;
}

// GET /api/services?kind=service|tutor&category=&campus=&q=&sort=recent|popular|rating&mine=1&saved=1
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const db = await getDb();
  const sessionUserId = await getSessionUserId();

  const kind = searchParams.get('kind');
  const category = searchParams.get('category');
  const campus = searchParams.get('campus');
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const sort = searchParams.get('sort') || 'recent';
  const mine = searchParams.get('mine') === '1';
  const savedOnly = searchParams.get('saved') === '1';

  const where: string[] = [];
  const args: any[] = [];
  if (kind === 'service' || kind === 'tutor') { where.push('kind = ?'); args.push(kind); }
  if (category) { where.push('category = ?'); args.push(category); }
  if (campus) { where.push('LOWER(campus) = ?'); args.push(campus.toLowerCase()); }
  if (mine && sessionUserId) { where.push('providerId = ?'); args.push(sessionUserId); }
  if (savedOnly && sessionUserId) { where.push('id IN (SELECT serviceId FROM service_saves WHERE userId = ?)'); args.push(sessionUserId); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  let rows = await db.prepare(`SELECT * FROM services ${whereSql}`).all(...args) as any[];
  if (q) rows = rows.filter(r =>
    (r.name || '').toLowerCase().includes(q) ||
    (r.description || '').toLowerCase().includes(q) ||
    (r.subjects || '').toLowerCase().includes(q) ||
    (r.category || '').toLowerCase().includes(q)
  );

  let result = await decorate(db, rows, sessionUserId);
  if (sort === 'popular') result.sort((a, b) => (b.requestCount + b.ratingCount) - (a.requestCount + a.ratingCount));
  else if (sort === 'rating') result.sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount);
  else result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(result);
}

// POST /api/services — create a service or tutor profile (provider = authenticated user).
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const providerId = auth;

  const body = await request.json();
  const { kind, name, description, category, rate, campus, availability, subjects, experience, portfolio } = body;
  const k = kind === 'tutor' ? 'tutor' : 'service';
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const cat = k === 'tutor' ? 'tutoring' : (CATEGORIES.includes(category) ? category : 'other');

  const db = await getDb();
  const id = `svc_${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = new Date().toISOString();
  await db.prepare(
    `INSERT INTO services (id, providerId, kind, name, description, category, rate, campus, availability, subjects, experience, portfolio, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, providerId, k, name.trim(), (description || '').trim(), cat, (rate || '').trim(),
    (campus || '').trim(), (availability || '').trim(), (subjects || '').trim(), (experience || '').trim(),
    JSON.stringify(Array.isArray(portfolio) ? portfolio.slice(0, 6) : []), createdAt
  );
  const created = await db.prepare('SELECT * FROM services WHERE id = ?').get(id) as any;
  return NextResponse.json({ ...created, portfolio: JSON.parse(created.portfolio || '[]'), ratingAvg: 0, ratingCount: 0, requestCount: 0, saved: false }, { status: 201 });
}
