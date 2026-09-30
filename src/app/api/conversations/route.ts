import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';

// POST /api/conversations — create or fetch a conversation for the authenticated user (connection-gated)
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth; // creator/participant is always the session user

  const body = await request.json();
  const { otherUserId, type = 'direct', name, participantIds, description, image, privacy } = body;

  const db = await getDb();

  if (type === 'direct') {
    if (!otherUserId) return NextResponse.json({ error: 'otherUserId required' }, { status: 400 });

    // Enforce connection rule
    const connected = await db.prepare('SELECT * FROM connections WHERE userId = ? AND connectedUserId = ?').get(userId, otherUserId);
    if (!connected) return NextResponse.json({ error: 'You must be connected to message this person' }, { status: 403 });

    // Find existing direct conversation
    const all = await db.prepare("SELECT * FROM conversations WHERE type = 'direct'").all() as any[];
    const existing = all.find(c => {
      const parts = JSON.parse(c.participants || '[]');
      return parts.includes(userId) && parts.includes(otherUserId);
    });
    if (existing) return NextResponse.json({ id: existing.id, existing: true });

    const id = `conv_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO conversations (id, type, participants) VALUES (?, ?, ?)').run(id, 'direct', JSON.stringify([userId, otherUserId]));
    return NextResponse.json({ id, existing: false }, { status: 201 });
  }

  // Group conversation — the creator is always a member AND the sole initial admin.
  const cleanName = (name || '').toString().trim().slice(0, 60);
  if (!cleanName) return NextResponse.json({ error: 'Group name is required' }, { status: 400 });

  // Only real, connected friends can be added at creation. Silently drop any id that
  // isn't a friend of the creator (prevents adding strangers / invalid ids via the body).
  const friendRows = await db.prepare('SELECT connectedUserId FROM connections WHERE userId = ?').all(userId) as any[];
  const friendIds = new Set(friendRows.map(r => r.connectedUserId));
  const requested = Array.isArray(participantIds) ? participantIds.filter((x: any) => typeof x === 'string') : [];
  const validMembers = requested.filter((id: string) => friendIds.has(id));

  const parts = Array.from(new Set([userId, ...validMembers]));
  const adminIds = [userId];
  const priv = privacy === 'discoverable' ? 'discoverable' : 'private';
  const desc = (description || '').toString().trim().slice(0, 300);
  const id = `conv_${crypto.randomUUID().slice(0, 8)}`;
  // A shareable invite code — anyone with the link can join, even for private groups.
  const inviteCode = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  await db.prepare('INSERT INTO conversations (id, type, name, description, image, privacy, participants, adminIds, inviteCode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, 'group', cleanName, desc, (image || '').toString() || null, priv, JSON.stringify(parts), JSON.stringify(adminIds), inviteCode);

  // Notify each added member (never the creator).
  for (const memberId of parts) {
    if (memberId === userId) continue;
    const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)')
      .run(nid, memberId, 'group-message', userId, `${await actorName(db, userId)} added you to "${cleanName}"`, id, 'conversation');
  }

  return NextResponse.json({ id, existing: false }, { status: 201 });
}

async function actorName(db: any, userId: string): Promise<string> {
  const u = await db.prepare('SELECT name, username FROM users WHERE id = ?').get(userId) as any;
  return u?.name || u?.username || 'Someone';
}
