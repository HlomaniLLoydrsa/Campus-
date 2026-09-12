import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { sendEmail, isEmailConfigured } from '@/lib/mailer';

// POST /api/auth/forgot-password  { email }
// Always responds { success: true } regardless of whether the email exists, to
// avoid leaking which addresses are registered. If the account exists and email
// is configured, a reset link is sent.
export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({}));
  if (!email || typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const db = await getDb();
  const user = await db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(email.trim()) as any;

  // Report whether email delivery is even possible, so the UI can guide the user.
  const emailConfigured = isEmailConfigured();

  if (user) {
    // A random opaque token; only its hash is stored. Valid for 1 hour.
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const id = `prt_${crypto.randomUUID().slice(0, 8)}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Invalidate any earlier unused tokens for this user, then store the new one.
    await db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE userId = ? AND used = 0').run(user.id);
    await db.prepare('INSERT INTO password_reset_tokens (id, userId, tokenHash, expiresAt, used) VALUES (?, ?, ?, ?, 0)').run(id, user.id, tokenHash, expiresAt);

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, '');
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    if (emailConfigured) {
      const html = `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#1A3F75;">Reset your VYBE password</h2>
          <p>Hi ${user.name || 'there'}, we got a request to reset your password.</p>
          <p><a href="${resetLink}" style="display:inline-block;background:#1A3F75;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;">Reset password</a></p>
          <p style="color:#666;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
          <p style="color:#999;font-size:12px;word-break:break-all;">${resetLink}</p>
        </div>`;
      await sendEmail(user.email, 'Reset your VYBE password', html);
    }
  }

  return NextResponse.json({ success: true, emailConfigured });
}
