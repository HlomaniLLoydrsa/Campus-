import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

// GET /api/connections — the authenticated user's connections
export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const db = await getDb();
  const connections = await db.prepare('SELECT connectedUserId, type FROM connections WHERE userId = ?').all(userId);
  return NextResponse.json(connections);
}

// DELETE /api/connections?targetId=y — remove a connection between the authenticated user and targetId (both directions)
export async function DELETE(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get('targetId');
  if (!targetId) return NextResponse.json({ error: 'targetId required' }, { status: 400 });

  const db = await getDb();
  await db.prepare('DELETE FROM connections WHERE (userId = ? AND connectedUserId = ?) OR (userId = ? AND connectedUserId = ?)').run(userId, targetId, targetId, userId);
  return NextResponse.json({ success: true });
}
