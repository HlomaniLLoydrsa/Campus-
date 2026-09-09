import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

// GET /api/games/:id — fetch a single game.
// Private (friend) games are only visible to the creator and the invited friend.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const db = await getDb();
  const game = await db.prepare('SELECT * FROM games WHERE id = ?').get(id) as any;
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  if (game.visibility === 'private') {
    if (userId !== game.creatorId && userId !== game.targetUserId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
  }

  return NextResponse.json({
    ...game,
    participants: JSON.parse(game.participants || '[]'),
    data: JSON.parse(game.data || '{}'),
  });
}
