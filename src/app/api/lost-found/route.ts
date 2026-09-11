import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId, getSessionUserId } from '@/lib/auth';

const CATEGORIES = ['electronics', 'phone', 'laptop', 'wallet', 'keys', 'student-card', 'clothing', 'bag', 'books', 'calculator', 'jewellery', 'other'];

// Public shape — never expose the private ownership question in lists.
function toPublic(r: any, sessionUserId: string | null) {
  const isOwner = sessionUserId && r.reporterId === sessionUserId;
  return {
    id: r.id, reporterId: r.reporterId, kind: r.kind, itemName: r.itemName,
    category: r.category, description: r.description, photo: r.photo,
    location: r.location, campus: r.campus, dateOn: r.dateOn, status: r.status, createdAt: r.createdAt,
    hasSecret: !!(r.secretQuestion && r.secretQuestion.trim()),
    // Owner also sees their own verification question.
    ...(isOwner ? { secretQuestion: r.secretQuestion } : {}),
  };
}

// GET /api/lost-found?kind=lost|found&category=&campus=&q=&mine=1
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const db = await getDb();
  const sessionUserId = await getSessionUserId();

  const kind = searchParams.get('kind');
  const category = searchParams.get('category');
  const campus = searchParams.get('campus');
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const mine = searchParams.get('mine') === '1';

  const where: string[] = [];
  const args: any[] = [];
  if (kind === 'lost' || kind === 'found') { where.push('kind = ?'); args.push(kind); }
  if (category) { where.push('category = ?'); args.push(category); }
  if (campus) { where.push('LOWER(campus) = ?'); args.push(campus.toLowerCase()); }
  if (mine && sessionUserId) { where.push('reporterId = ?'); args.push(sessionUserId); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  let rows = await db.prepare(`SELECT * FROM lost_found ${whereSql} ORDER BY createdAt DESC`).all(...args) as any[];
  if (q) {
    rows = rows.filter(r =>
      (r.itemName || '').toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q) ||
      (r.location || '').toLowerCase().includes(q)
    );
  }
  return NextResponse.json(rows.map(r => toPublic(r, sessionUserId)));
}

// POST /api/lost-found — report a lost or found item; suggests possible matches.
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const reporterId = auth;

  const body = await request.json();
  const { kind, itemName, category, description, photo, location, campus, dateOn, secretQuestion } = body;
  if (kind !== 'lost' && kind !== 'found') return NextResponse.json({ error: 'kind must be lost or found' }, { status: 400 });
  if (!itemName?.trim()) return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
  const cat = CATEGORIES.includes(category) ? category : 'other';

  const db = await getDb();
  const id = `lf_${crypto.randomUUID().slice(0, 8)}`;
  await db.prepare(
    `INSERT INTO lost_found (id, reporterId, kind, itemName, category, description, photo, location, campus, dateOn, secretQuestion, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`
  ).run(
    id, reporterId, kind, itemName.trim(), cat, (description || '').trim(), photo || null,
    (location || '').trim(), (campus || '').trim(), (dateOn || '').trim(), (secretQuestion || '').trim()
  );

  // Matching: look for OPEN items of the opposite kind in the same category with
  // overlapping name/location words.
  const opposite = kind === 'lost' ? 'found' : 'lost';
  const candidates = await db.prepare("SELECT * FROM lost_found WHERE kind = ? AND category = ? AND status = 'open'").all(opposite, cat) as any[];
  const words = `${itemName} ${location}`.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const matches = candidates.filter(c => {
    const hay = `${c.itemName} ${c.location} ${c.description}`.toLowerCase();
    return words.some(w => hay.includes(w));
  });

  // Notify both the new reporter and the owners of matched items.
  for (const m of matches.slice(0, 5)) {
    const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO notifications (id, userId, type, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, 0)').run(
      nid, m.reporterId, 'mention', `Possible match for your ${opposite} "${m.itemName}" 🔎`, m.id, 'lostfound'
    );
  }
  if (matches.length > 0) {
    const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO notifications (id, userId, type, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, 0)').run(
      nid, reporterId, 'mention', `We found ${matches.length} possible match${matches.length > 1 ? 'es' : ''} for "${itemName.trim()}" 🔎`, id, 'lostfound'
    );
  }

  const created = await db.prepare('SELECT * FROM lost_found WHERE id = ?').get(id);
  return NextResponse.json({ ...toPublic(created, reporterId), matchCount: matches.length }, { status: 201 });
}
