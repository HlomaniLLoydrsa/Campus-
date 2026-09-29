import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, deleteUserCascade } from '@/lib/admin';

// GET /api/admin/users?q=<search> — admin user list (includes email, status, isAdmin).
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();

  const db = await getDb();
  let rows: any[];
  if (q) {
    const like = `%${q}%`;
    rows = await db.prepare(
      `SELECT id, name, username, email, avatar, status, isAdmin, createdAt, lastSeen
       FROM users
       WHERE LOWER(name) LIKE ? OR LOWER(username) LIKE ? OR LOWER(email) LIKE ?
       ORDER BY createdAt DESC LIMIT 200`
    ).all(like, like, like) as any[];
  } else {
    rows = await db.prepare(
      `SELECT id, name, username, email, avatar, status, isAdmin, createdAt, lastSeen
       FROM users ORDER BY createdAt DESC LIMIT 200`
    ).all() as any[];
  }

  return NextResponse.json(rows.map(u => ({
    id: u.id, name: u.name, username: u.username, email: u.email, avatar: u.avatar || '',
    status: u.status || 'active', isAdmin: !!u.isAdmin, createdAt: u.createdAt, lastSeen: u.lastSeen,
  })));
}

// PATCH /api/admin/users  { userId, action: 'suspend' | 'unsuspend' }
export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { userId, action } = await request.json().catch(() => ({}));
  if (!userId || !action) return NextResponse.json({ error: 'userId and action are required' }, { status: 400 });

  const db = await getDb();
  const target = await db.prepare('SELECT id, isAdmin FROM users WHERE id = ?').get(userId) as any;
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Admins can't suspend themselves or other admins (avoids locking everyone out).
  if (target.isAdmin && action === 'suspend') {
    return NextResponse.json({ error: 'You cannot suspend an admin account.' }, { status: 400 });
  }

  if (action === 'suspend') {
    await db.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").run(userId);
    return NextResponse.json({ success: true, status: 'suspended' });
  }
  if (action === 'unsuspend') {
    await db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(userId);
    return NextResponse.json({ success: true, status: 'active' });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

// DELETE /api/admin/users?userId=<id> — permanently remove a user and their data.
export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

  const db = await getDb();
  const target = await db.prepare('SELECT id, isAdmin FROM users WHERE id = ?').get(userId) as any;
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (target.isAdmin) return NextResponse.json({ error: 'You cannot delete an admin account.' }, { status: 400 });
  if (userId === admin.userId) return NextResponse.json({ error: 'You cannot delete your own account here.' }, { status: 400 });

  await deleteUserCascade(userId);
  return NextResponse.json({ success: true });
}
