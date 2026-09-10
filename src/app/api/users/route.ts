import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Public-safe columns only — NEVER select password or email into a list every user can read.
const PUBLIC_COLUMNS =
  'id, name, username, avatar, coverImage, bio, course, faculty, yearOfStudy, interests, hobbies, isOnline, lastSeen, wingmanEnabled, createdAt';

export async function GET() {
  const db = await getDb();
  const users = await db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users`).all();
  // A user is "online" if they've pinged the server within the last 90 seconds.
  const ONLINE_WINDOW_MS = 90 * 1000;
  const now = Date.now();
  return NextResponse.json(users.map((u: any) => {
    const seen = u.lastSeen ? new Date(u.lastSeen).getTime() : 0;
    const online = seen > 0 && (now - seen) < ONLINE_WINDOW_MS;
    return {
      ...u,
      interests: JSON.parse(u.interests || '[]'),
      hobbies: JSON.parse(u.hobbies || '[]'),
      isOnline: online,
      wingmanEnabled: !!u.wingmanEnabled,
    };
  }));
}
