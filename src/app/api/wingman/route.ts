import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';

// GET /api/wingman — suggestions involving the authenticated user (as the person
// suggested-for, the suggested person, or the wingman who made the match).
export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const db = await getDb();
  const rows = await db.prepare('SELECT * FROM wingman_suggestions WHERE forUserId = ? OR suggestedUserId = ? OR wingmanId = ? ORDER BY createdAt DESC').all(userId, userId, userId);
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

  // 1) The person the suggestion is FOR — they can accept/reject.
  const nid1 = `n_${crypto.randomUUID().slice(0, 8)}`;
  await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(
    nid1, forUserId, 'wingman-activity', wingmanId,
    `${wingmanName} thinks you and ${suggested?.name || 'someone'} could be a good match`, id, 'wingman'
  );

  // 2) The suggested person — they're notified too.
  const nid2 = `n_${crypto.randomUUID().slice(0, 8)}`;
  await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(
    nid2, suggestedUserId, 'wingman-activity', wingmanId,
    `${wingmanName} thinks you and ${forUser?.name || 'someone'} could be a good match`, id, 'wingman'
  );

  return NextResponse.json({ id, wingmanId, forUserId, suggestedUserId, reason, status: 'pending' }, { status: 201 });
}

// PATCH /api/wingman — the person the suggestion is FOR may accept/reject it.
// On accept: connect the two people (friend connection, both directions) and open a
// direct conversation so they can start talking. Idempotent — no duplicate connections.
export async function PATCH(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await request.json();
  const { id, action } = body; // 'accepted' | 'rejected'
  const decision = action === 'accepted' ? 'accepted' : 'rejected';
  const db = await getDb();
  const ws = await db.prepare('SELECT * FROM wingman_suggestions WHERE id = ?').get(id) as any;
  if (!ws) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (ws.forUserId !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  // Only act on a still-pending suggestion (prevents double-accept creating dupes).
  if (ws.status !== 'pending') return NextResponse.json({ success: true, status: ws.status });

  await db.prepare('UPDATE wingman_suggestions SET status = ? WHERE id = ?').run(decision, id);

  if (decision === 'accepted') {
    const a = ws.forUserId, b = ws.suggestedUserId;
    // Establish a friend connection both ways (idempotent via UNIQUE + INSERT OR IGNORE).
    await db.prepare('INSERT OR IGNORE INTO connections (userId, connectedUserId, type) VALUES (?, ?, ?)').run(a, b, 'friend');
    await db.prepare('INSERT OR IGNORE INTO connections (userId, connectedUserId, type) VALUES (?, ?, ?)').run(b, a, 'friend');
    // Cancel any pending connection request between them so state stays consistent.
    await db.prepare("UPDATE connection_requests SET status = 'accepted' WHERE status = 'pending' AND ((fromUserId = ? AND toUserId = ?) OR (fromUserId = ? AND toUserId = ?))").run(a, b, b, a);

    // Find or create their direct conversation so they can start talking.
    const all = await db.prepare("SELECT * FROM conversations WHERE type = 'direct'").all() as any[];
    let conv = all.find(c => { const p = JSON.parse(c.participants || '[]'); return p.includes(a) && p.includes(b); });
    let convId: string;
    if (conv) { convId = conv.id; }
    else { convId = `conv_${crypto.randomUUID().slice(0, 8)}`; await db.prepare('INSERT INTO conversations (id, type, participants) VALUES (?, ?, ?)').run(convId, 'direct', JSON.stringify([a, b])); }

    const aUser = await db.prepare('SELECT name FROM users WHERE id = ?').get(a) as any;
    const bUser = await db.prepare('SELECT name FROM users WHERE id = ?').get(b) as any;
    // Notify both that they're now connected.
    const n1 = `n_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(
      n1, b, 'new-connection', a, `You and ${aUser?.name || 'someone'} are now connected — say hi! 🏹`, convId, 'conversation'
    );
    const n2 = `n_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(
      n2, a, 'new-connection', b, `You and ${bUser?.name || 'someone'} are now connected — say hi! 🏹`, convId, 'conversation'
    );
    return NextResponse.json({ success: true, status: 'accepted', conversationId: convId });
  }

  return NextResponse.json({ success: true, status: 'rejected' });
}
