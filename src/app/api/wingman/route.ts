import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';

// GET /api/wingman — suggestions involving the authenticated user
export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const db = await getDb();
  const rows = await db.prepare('SELECT * FROM wingman_suggestions WHERE forUserId = ? OR wingmanId = ? ORDER BY createdAt DESC').all(userId, userId);
  return NextResponse.json(rows);
}

// POST /api/wingman — the wingman is always the authenticated user
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const wingmanId = auth;

  const body = await request.json();
  const { forUserId, suggestedUserId, reason } = body;
  if (!forUserId || !suggestedUserId || !reason?.trim()) return NextResponse.json({ error: 'All fields required' }, { status: 400 });

  const db = await getDb();
  const id = `ws_${crypto.randomUUID().slice(0, 8)}`;
  await db.prepare('INSERT INTO wingman_suggestions (id, wingmanId, forUserId, suggestedUserId, reason, status) VALUES (?, ?, ?, ?, ?, ?)').run(id, wingmanId, forUserId, suggestedUserId, reason.trim(), 'pending');

  // Notify BOTH people involved in the match.
  const wingman = await db.prepare('SELECT name FROM users WHERE id = ?').get(wingmanId) as any;
  const forUser = await db.prepare('SELECT name FROM users WHERE id = ?').get(forUserId) as any;
  const suggested = await db.prepare('SELECT name FROM users WHERE id = ?').get(suggestedUserId) as any;
  const wingmanName = wingman?.name || 'A friend';

  // 1) The person the suggestion is FOR
  const nid1 = `n_${crypto.randomUUID().slice(0, 8)}`;
  await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, read) VALUES (?, ?, ?, ?, ?, 0)').run(
    nid1, forUserId, 'wingman-activity', wingmanId,
    `${wingmanName} thinks you and ${suggested?.name || 'someone'} would hit it off 🏹`
  );

  // 2) The suggested person
  const nid2 = `n_${crypto.randomUUID().slice(0, 8)}`;
  await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, read) VALUES (?, ?, ?, ?, ?, 0)').run(
    nid2, suggestedUserId, 'wingman-activity', wingmanId,
    `${wingmanName} thinks you and ${forUser?.name || 'someone'} would hit it off 🏹`
  );

  return NextResponse.json({ id, wingmanId, forUserId, suggestedUserId, reason, status: 'pending' }, { status: 201 });
}

// PATCH /api/wingman — only the person the suggestion is FOR may accept/reject it
export async function PATCH(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await request.json();
  const { id, action } = body; // accepted | rejected
  const db = await getDb();
  const ws = await db.prepare('SELECT * FROM wingman_suggestions WHERE id = ?').get(id) as any;
  if (!ws) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (ws.forUserId !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  await db.prepare('UPDATE wingman_suggestions SET status = ? WHERE id = ?').run(action, id);
  return NextResponse.json({ success: true });
}
