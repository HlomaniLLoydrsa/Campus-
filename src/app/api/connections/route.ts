import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/connections?userId=u1 — get all connections for a user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const db = getDb();
  const connections = db.prepare('SELECT connectedUserId, type FROM connections WHERE userId = ?').all(userId);
  return NextResponse.json(connections);
}

// DELETE /api/connections?userId=x&targetId=y — remove a connection (both directions)
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const targetId = searchParams.get('targetId');
  if (!userId || !targetId) return NextResponse.json({ error: 'userId and targetId required' }, { status: 400 });

  const db = getDb();
  db.prepare('DELETE FROM connections WHERE (userId = ? AND connectedUserId = ?) OR (userId = ? AND connectedUserId = ?)').run(userId, targetId, targetId, userId);
  return NextResponse.json({ success: true });
}
