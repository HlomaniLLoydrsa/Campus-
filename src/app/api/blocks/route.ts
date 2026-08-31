import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/blocks?userId=xxx — get list of users this person has blocked
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
  const db = getDb();
  const rows = db.prepare('SELECT blockedId FROM blocks WHERE blockerId = ?').all(userId) as any[];
  return NextResponse.json(rows.map(r => r.blockedId));
}

// POST /api/blocks — block a user (also removes any connection between them)
export async function POST(request: Request) {
  const body = await request.json();
  const { blockerId, blockedId } = body;
  if (!blockerId || !blockedId) return NextResponse.json({ error: 'blockerId, blockedId required' }, { status: 400 });

  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO blocks (blockerId, blockedId) VALUES (?, ?)').run(blockerId, blockedId);
  // Remove connections both directions
  db.prepare('DELETE FROM connections WHERE (userId = ? AND connectedUserId = ?) OR (userId = ? AND connectedUserId = ?)').run(blockerId, blockedId, blockedId, blockerId);
  // Cancel any pending requests both directions
  db.prepare("UPDATE connection_requests SET status = 'cancelled' WHERE ((fromUserId = ? AND toUserId = ?) OR (fromUserId = ? AND toUserId = ?)) AND status = 'pending'").run(blockerId, blockedId, blockedId, blockerId);
  return NextResponse.json({ success: true }, { status: 201 });
}

// DELETE /api/blocks?blockerId=x&blockedId=y — unblock
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const blockerId = searchParams.get('blockerId');
  const blockedId = searchParams.get('blockedId');
  if (!blockerId || !blockedId) return NextResponse.json({ error: 'blockerId, blockedId required' }, { status: 400 });
  const db = getDb();
  db.prepare('DELETE FROM blocks WHERE blockerId = ? AND blockedId = ?').run(blockerId, blockedId);
  return NextResponse.json({ success: true });
}
