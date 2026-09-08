import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

// GET /api/notifications — the authenticated user's own notifications only
export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const db = await getDb();
  const notifications = await db.prepare('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50').all(userId);
  return NextResponse.json(notifications.map((n: any) => ({ ...n, read: !!n.read })));
}

// PATCH /api/notifications — mark the authenticated user's notifications as read
export async function PATCH(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await request.json();
  const { action, notificationId } = body;

  const db = await getDb();

  if (action === 'markAllRead') {
    await db.prepare('UPDATE notifications SET read = 1 WHERE userId = ?').run(userId);
    return NextResponse.json({ success: true });
  }

  if (action === 'markRead' && notificationId) {
    // Only allow marking a notification that belongs to the caller.
    await db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND userId = ?').run(notificationId, userId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
