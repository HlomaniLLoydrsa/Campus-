import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/notifications?userId=u1
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const db = await getDb();
  const notifications = await db.prepare('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50').all(userId);
  return NextResponse.json(notifications.map((n: any) => ({ ...n, read: !!n.read })));
}

// PATCH /api/notifications — mark as read
export async function PATCH(request: Request) {
  const body = await request.json();
  const { action, userId, notificationId } = body;

  const db = await getDb();

  if (action === 'markAllRead' && userId) {
    await db.prepare('UPDATE notifications SET read = 1 WHERE userId = ?').run(userId);
    return NextResponse.json({ success: true });
  }

  if (action === 'markRead' && notificationId) {
    await db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(notificationId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
