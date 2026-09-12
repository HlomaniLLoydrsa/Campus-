import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// POST /api/auth/reset-password  { token, newPassword }
// Validates a reset token and sets a new password.
export async function POST(request: Request) {
  const { token, newPassword } = await request.json().catch(() => ({}));

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Invalid or missing reset token' }, { status: 400 });
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const db = await getDb();
  const row = await db.prepare('SELECT * FROM password_reset_tokens WHERE tokenHash = ?').get(tokenHash) as any;

  if (!row || row.used) {
    return NextResponse.json({ error: 'This reset link is invalid or has already been used.' }, { status: 400 });
  }
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: 'This reset link has expired. Please request a new one.' }, { status: 400 });
  }

  const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(row.userId) as any;
  if (!user) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(newPassword), user.id);
  await db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(row.id);

  return NextResponse.json({ success: true });
}
