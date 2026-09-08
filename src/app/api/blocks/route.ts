import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

// GET /api/blocks — users the authenticated person has blocked
export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const db = await getDb();
  const rows = await db.prepare('SELECT blockedId FROM blocks WHERE blockerId = ?').all(userId) as any[];
  return NextResponse.json(rows.map(r => r.blockedId));
}

// POST /api/blocks — the authenticated user blocks someone (also removes any connection)
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const blockerId = auth;

  const body = await request.json();
  const { blockedId } = body;
  if (!blockedId) return NextResponse.json({ error: 'blockedId required' }, { status: 400 });

  const db = await getDb();
  await db.prepare('INSERT OR IGNORE INTO blocks (blockerId, blockedId) VALUES (?, ?)').run(blockerId, blockedId);
  // Remove connections both directions
  await db.prepare('DELETE FROM connections WHERE (userId = ? AND connectedUserId = ?) OR (userId = ? AND connectedUserId = ?)').run(blockerId, blockedId, blockedId, blockerId);
  // Cancel any pending requests both directions
  await db.prepare("UPDATE connection_requests SET status = 'cancelled' WHERE ((fromUserId = ? AND toUserId = ?) OR (fromUserId = ? AND toUserId = ?)) AND status = 'pending'").run(blockerId, blockedId, blockedId, blockerId);
  return NextResponse.json({ success: true }, { status: 201 });
}

// DELETE /api/blocks?blockedId=y — the authenticated user unblocks someone
export async function DELETE(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const blockerId = auth;

  const { searchParams } = new URL(request.url);
  const blockedId = searchParams.get('blockedId');
  if (!blockedId) return NextResponse.json({ error: 'blockedId required' }, { status: 400 });
  const db = await getDb();
  await db.prepare('DELETE FROM blocks WHERE blockerId = ? AND blockedId = ?').run(blockerId, blockedId);
  return NextResponse.json({ success: true });
}
