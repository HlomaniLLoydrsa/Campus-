import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId, verifyPassword, hashPassword } from '@/lib/auth';

// POST /api/auth/change-password — change the authenticated user's password.
// Body: { currentPassword, newPassword }
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { currentPassword, newPassword } = await request.json().catch(() => ({}));

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
  }

  const db = await getDb();
  const user = await db.prepare('SELECT id, password FROM users WHERE id = ?').get(userId) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // If the account already has a password set, the current one must match.
  if (user.password) {
    if (!currentPassword || !verifyPassword(currentPassword, user.password)) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }
  }

  const newHash = hashPassword(newPassword);
  await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHash, userId);

  return NextResponse.json({ success: true });
}
