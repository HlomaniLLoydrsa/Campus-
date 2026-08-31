import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

// POST /api/conversations — create or fetch a direct conversation (connection-gated)
export async function POST(request: Request) {
  const body = await request.json();
  const { userId, otherUserId, type = 'direct', name, participantIds } = body;
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

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
