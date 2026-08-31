import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

// GET /api/secret-admirers?userId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const db = getDb();
  const rows = db.prepare('SELECT * FROM secret_admirers WHERE toUserId = ? OR fromUserId = ? ORDER BY createdAt DESC').all(userId, userId);
  return NextResponse.json(rows.map((r: any) => ({
    id: r.id, fromUserId: r.fromUserId, toUserId: r.toUserId, message: r.message,
    status: r.status, createdAt: r.createdAt,
    revealConsent: { from: !!r.revealFrom, to: !!r.revealTo },
  })));
}

// POST /api/secret-admirers
export async function POST(request: Request) {
  const body = await request.json();
  const { fromUserId, toUserId, message } = body;
  if (!fromUserId || !toUserId || !message?.trim()) return NextResponse.json({ error: 'fromUserId, toUserId, message required' }, { status: 400 });
  if (fromUserId === toUserId) return NextResponse.json({ error: 'Cannot send to yourself' }, { status: 400 });

  const db = getDb();
  const id = `sa_${crypto.randomUUID().slice(0, 8)}`;
  db.prepare('INSERT INTO secret_admirers (id, fromUserId, toUserId, message, status) VALUES (?, ?, ?, ?, ?)').run(id, fromUserId, toUserId, message.trim(), 'pending');

  // Notify recipient anonymously
  const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
  db.prepare('INSERT INTO notifications (id, userId, type, message, read) VALUES (?, ?, ?, ?, 0)').run(nid, toUserId, 'secret-admirer', 'You have a Secret Admirer 👀');

  return NextResponse.json({ id, fromUserId, toUserId, message, status: 'pending', revealConsent: { from: false, to: false } }, { status: 201 });
}

// PATCH /api/secret-admirers
// action: 'curious' (recipient), 'reveal' (either side consents to reveal), 'ignored', 'blocked'
export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, action, userId } = body;
  const db = getDb();
  const sa = db.prepare('SELECT * FROM secret_admirers WHERE id = ?').get(id) as any;
  if (!sa) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (action === 'curious') {
    // Recipient is curious — consents to reveal from their side
    db.prepare("UPDATE secret_admirers SET status = 'curious', revealTo = 1 WHERE id = ?").run(id);
    // Notify the sender that the recipient is curious (so sender can choose to reveal)
    const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
    db.prepare('INSERT INTO notifications (id, userId, type, message, read) VALUES (?, ?, ?, ?, 0)').run(nid, sa.fromUserId, 'secret-admirer', 'Someone you admire is curious! Reveal yourself? 👀');
    return NextResponse.json({ success: true, status: 'curious' });
  }

  if (action === 'reveal') {
    // Determine which side is consenting
    const isSender = userId === sa.fromUserId;
    const isRecipient = userId === sa.toUserId;
    if (isSender) db.prepare('UPDATE secret_admirers SET revealFrom = 1 WHERE id = ?').run(id);
    if (isRecipient) db.prepare('UPDATE secret_admirers SET revealTo = 1 WHERE id = ?').run(id);

    const updated = db.prepare('SELECT * FROM secret_admirers WHERE id = ?').get(id) as any;
    // Mutual consent → reveal identities to both
    if (updated.revealFrom && updated.revealTo) {
      db.prepare("UPDATE secret_admirers SET status = 'revealed' WHERE id = ?").run(id);
      const sender = db.prepare('SELECT name FROM users WHERE id = ?').get(sa.fromUserId) as any;
      const recipient = db.prepare('SELECT name FROM users WHERE id = ?').get(sa.toUserId) as any;
      const n1 = `n_${crypto.randomUUID().slice(0, 8)}`;
      const n2 = `n_${crypto.randomUUID().slice(0, 8)}`;
      db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, read) VALUES (?, ?, ?, ?, ?, 0)').run(n1, sa.toUserId, 'secret-admirer', sa.fromUserId, `Your secret admirer was ${sender?.name || 'someone'}! 💘`);
      db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, read) VALUES (?, ?, ?, ?, ?, 0)').run(n2, sa.fromUserId, 'secret-admirer', sa.toUserId, `${recipient?.name || 'They'} now knows it was you! 💘`);
      return NextResponse.json({ success: true, status: 'revealed', revealed: true });
    }
    return NextResponse.json({ success: true, status: updated.status, revealed: false });
  }

  // ignored / blocked
  db.prepare('UPDATE secret_admirers SET status = ? WHERE id = ?').run(action, id);
  return NextResponse.json({ success: true, status: action });
}
