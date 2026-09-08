import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUserId, clearSessionCookie } from '@/lib/auth';

// POST /api/auth/logout — clear the session cookie and mark the user offline.
export async function POST() {
  const userId = await getSessionUserId();
  if (userId) {
    try {
      const db = await getDb();
      await db.prepare('UPDATE users SET isOnline = 0, lastSeen = ? WHERE id = ?').run(new Date().toISOString(), userId);
    } catch { /* non-fatal */ }
  }
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
