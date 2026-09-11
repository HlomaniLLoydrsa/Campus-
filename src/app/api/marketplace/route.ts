import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId, getSessionUserId } from '@/lib/auth';

const CATEGORIES = ['electronics', 'phone', 'laptop', 'books', 'clothing', 'shoes', 'furniture', 'appliances', 'gaming', 'accessories', 'calculator', 'essentials', 'other'];

// GET /api/marketplace?q=&category=&condition=&campus=&minPrice=&maxPrice=&sort=recent|cheapest|priciest&mine=1&saved=1&sold=1
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const db = await getDb();
  const sessionUserId = await getSessionUserId();

  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const category = searchParams.get('category');
  const condition = searchParams.get('condition');
  const campus = searchParams.get('campus');
  const sort = searchParams.get('sort') || 'recent';
  const mine = searchParams.get('mine') === '1';
  const savedOnly = searchParams.get('saved') === '1';
  const soldView = searchParams.get('sold') === '1';

  const where: string[] = [];
  const args: any[] = [];
  if (mine && sessionUserId) { where.push('sellerId = ?'); args.push(sessionUserId); }
  else if (!soldView) { where.push("status = 'available'"); } // public browse hides sold
  if (soldView && sessionUserId) { where.push('sellerId = ? AND status = ?'); args.push(sessionUserId, 'sold'); }
  if (category) { where.push('category = ?'); args.push(category); }
  if (condition) { where.push('condition = ?'); args.push(condition); }
  if (campus) { where.push('LOWER(campus) = ?'); args.push(campus.toLowerCase()); }
  if (savedOnly && sessionUserId) { where.push('id IN (SELECT listingId FROM marketplace_saves WHERE userId = ?)'); args.push(sessionUserId); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  let rows = await db.prepare(`SELECT * FROM marketplace_listings ${whereSql}`).all(...args) as any[];
  if (q) rows = rows.filter(r => (r.title || '').toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q));

  if (sort === 'cheapest') rows.sort((a, b) => a.price - b.price);
  else if (sort === 'priciest') rows.sort((a, b) => b.price - a.price);
  else rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const result = [];
  for (const r of rows) {
    let saved = false;
    if (sessionUserId) saved = !!(await db.prepare('SELECT 1 FROM marketplace_saves WHERE listingId = ? AND userId = ?').get(r.id, sessionUserId));
    result.push({ ...r, images: JSON.parse(r.images || '[]'), saved });
  }
  return NextResponse.json(result);
}

// POST /api/marketplace — create a listing (seller = authenticated user).
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const sellerId = auth;

  const body = await request.json();
  const { title, description, price, category, condition, images, campus } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  const cat = CATEGORIES.includes(category) ? category : 'other';

  const db = await getDb();
  const id = `mkt_${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = new Date().toISOString();
  await db.prepare(
    `INSERT INTO marketplace_listings (id, sellerId, title, description, price, category, condition, images, campus, status, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?)`
  ).run(
    id, sellerId, title.trim(), (description || '').trim(), Number(price) || 0, cat,
    condition || 'good', JSON.stringify(Array.isArray(images) ? images.slice(0, 6) : []), (campus || '').trim(), createdAt
  );
  const created = await db.prepare('SELECT * FROM marketplace_listings WHERE id = ?').get(id) as any;
  return NextResponse.json({ ...created, images: JSON.parse(created.images || '[]'), saved: false }, { status: 201 });
}
