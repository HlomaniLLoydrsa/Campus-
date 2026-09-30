import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { getHiddenUserIds } from '@/lib/blocks';

// Public-safe columns only — NEVER select password or email into a list every user can read.
const PUBLIC_COLUMNS =
  'id, name, username, avatar, coverImage, bio, course, faculty, yearOfStudy, age, gender, university, interests, hobbies, isOnline, lastSeen, wingmanEnabled, createdAt';

export async function GET() {
  const db = await getDb();
  // Hide users blocked in either direction from the directory/discovery.
  const viewerId = await getSessionUserId();
  const hidden = viewerId ? await getHiddenUserIds(viewerId) : new Set<string>();
  const allUsers = await db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users`).all() as any[];
  const users = allUsers.filter(u => !hidden.has(u.id));
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
