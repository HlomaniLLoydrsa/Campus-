import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';

// POST /api/isawyou — send a private "I saw you" note to a specific person's inbox.
// It does NOT create a feed post. Can be sent anonymously or as yourself.
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const fromUserId = auth;

  const body = await request.json();
  const { toUserId, message, location, anonymous } = body;
  if (!toUserId || !message?.trim()) {
    return NextResponse.json({ error: 'toUserId and message are required' }, { status: 400 });
  }
  if (toUserId === fromUserId) {
    return NextResponse.json({ error: 'You cannot send this to yourself' }, { status: 400 });
  }

  const db = await getDb();
  const target = await db.prepare('SELECT id FROM users WHERE id = ?').get(toUserId) as any;
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const isAnon = !!anonymous;
  const sender = isAnon ? null : await db.prepare('SELECT name FROM users WHERE id = ?').get(fromUserId) as any;
  const senderName = isAnon ? 'Someone' : (sender?.name || 'Someone');
  const where = location?.trim() ? ` (at ${location.trim()})` : '';
  const noteMessage = `👀 ${senderName} saw you${where}: "${message.trim()}"`;

  if (isAnon) {
    // Anonymous: deliver only as a notification (a DM would reveal the sender as a participant).
    const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, read) VALUES (?, ?, ?, ?, ?, 0)').run(
      nid, toUserId, 'mention', null, noteMessage
    );
  } else {
    // Named: deliver as a real inbox message so it lands in their chat, plus a notification.
    const all = await db.prepare("SELECT * FROM conversations WHERE type = 'direct'").all() as any[];
    let conv = all.find(c => {
      const parts = JSON.parse(c.participants || '[]');
      return parts.includes(fromUserId) && parts.includes(toUserId);
    });
    let convId: string;
    if (conv) { convId = conv.id; }
    else {
      convId = `conv_${crypto.randomUUID().slice(0, 8)}`;
      await db.prepare('INSERT INTO conversations (id, type, participants) VALUES (?, ?, ?)').run(convId, 'direct', JSON.stringify([fromUserId, toUserId]));
    }
    const mid = `m_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO messages (id, conversationId, senderId, content, read, createdAt) VALUES (?, ?, ?, ?, 0, ?)').run(mid, convId, fromUserId, noteMessage, new Date().toISOString());
    const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(
      nid, toUserId, 'new-message', fromUserId, `${senderName} sent you an "I saw you" note`, convId, 'conversation'
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
