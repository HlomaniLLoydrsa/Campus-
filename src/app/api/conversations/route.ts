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
  const { otherUserId, type = 'direct', name, participantIds } = body;

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

  // Group conversation
  const parts = Array.from(new Set([userId, ...(participantIds || [])]));
  const id = `conv_${crypto.randomUUID().slice(0, 8)}`;
  await db.prepare('INSERT INTO conversations (id, type, name, participants) VALUES (?, ?, ?, ?)').run(id, 'group', name || 'Group Chat', JSON.stringify(parts));
  return NextResponse.json({ id, existing: false }, { status: 201 });
}
