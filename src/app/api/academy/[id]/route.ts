import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId, getSessionUserId } from '@/lib/auth';

// GET /api/academy/:id — a single resource with rating aggregate + caller state.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const sessionUserId = await getSessionUserId();

  const r = await db.prepare('SELECT * FROM academy_resources WHERE id = ?').get(id) as any;
  if (!r) return NextResponse.json({ error: 'Resource not found' }, { status: 404 });

  const agg = await db.prepare('SELECT COUNT(*) as c, AVG(rating) as avg FROM academy_ratings WHERE resourceId = ?').get(id) as any;
  let saved = false; let myRating = 0;
  if (sessionUserId) {
    saved = !!(await db.prepare('SELECT 1 FROM academy_saves WHERE resourceId = ? AND userId = ?').get(id, sessionUserId));
    const mr = await db.prepare('SELECT rating FROM academy_ratings WHERE resourceId = ? AND userId = ?').get(id, sessionUserId) as any;
    myRating = mr?.rating || 0;
  }
  return NextResponse.json({
    ...r,
    ratingCount: agg?.c || 0,
    ratingAvg: agg?.avg ? Math.round(agg.avg * 10) / 10 : 0,
    saved, myRating,
  });
}

// PATCH /api/academy/:id — actions: download | rate | save | unsave
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();

  const r = await db.prepare('SELECT * FROM academy_resources WHERE id = ?').get(id) as any;
  if (!r) return NextResponse.json({ error: 'Resource not found' }, { status: 404 });

  const body = await request.json();
  const { action, rating } = body;

  // Download count doesn't require auth (anyone browsing can download a public resource).
  if (action === 'download') {
    const downloads = (r.downloads || 0) + 1;
    await db.prepare('UPDATE academy_resources SET downloads = ? WHERE id = ?').run(downloads, id);
    // Notify the uploader at simple download milestones.
    if ([1, 10, 50, 100].includes(downloads) && r.uploaderId) {
      const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
      const msg = downloads === 1
        ? `Your resource "${r.title}" got its first download 🎉`
        : `Your resource "${r.title}" reached ${downloads} downloads 🎉`;
      await db.prepare('INSERT INTO notifications (id, userId, type, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, 0)').run(nid, r.uploaderId, 'badge', msg, id, 'resource');
    }
    return NextResponse.json({ downloads });
  }

  // The rest require a signed-in user.
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });

  if (action === 'rate') {
    const val = Number(rating);
    if (!val || val < 1 || val > 5) return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    await db.prepare('INSERT INTO academy_ratings (resourceId, userId, rating) VALUES (?, ?, ?) ON CONFLICT(resourceId, userId) DO UPDATE SET rating = excluded.rating').run(id, sessionUserId, val);
    const agg = await db.prepare('SELECT COUNT(*) as c, AVG(rating) as avg FROM academy_ratings WHERE resourceId = ?').get(id) as any;
    return NextResponse.json({ ratingCount: agg?.c || 0, ratingAvg: agg?.avg ? Math.round(agg.avg * 10) / 10 : 0, myRating: val });
  }

  if (action === 'save') {
    await db.prepare('INSERT OR IGNORE INTO academy_saves (resourceId, userId) VALUES (?, ?)').run(id, sessionUserId);
    return NextResponse.json({ saved: true });
  }
  if (action === 'unsave') {
    await db.prepare('DELETE FROM academy_saves WHERE resourceId = ? AND userId = ?').run(id, sessionUserId);
    return NextResponse.json({ saved: false });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// DELETE /api/academy/:id — the uploader may delete their own resource.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const db = await getDb();
  const r = await db.prepare('SELECT uploaderId FROM academy_resources WHERE id = ?').get(id) as any;
  if (!r) return NextResponse.json({ success: true });
  if (r.uploaderId !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  await db.prepare('DELETE FROM academy_resources WHERE id = ?').run(id);
  await db.prepare('DELETE FROM academy_ratings WHERE resourceId = ?').run(id);
  await db.prepare('DELETE FROM academy_saves WHERE resourceId = ?').run(id);
  return NextResponse.json({ success: true });
}
