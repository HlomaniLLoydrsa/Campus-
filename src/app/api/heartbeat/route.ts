import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

// POST /api/heartbeat — mark the authenticated user as recently active.
// Called periodically by the client so we can show accurate online status.
export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ ok: false });
  try {
    const db = await getDb();
    await db.prepare('UPDATE users SET isOnline = 1, lastSeen = ? WHERE id = ?').run(new Date().toISOString(), userId);
  } catch { /* non-fatal */ }
  return NextResponse.json({ ok: true });
}
