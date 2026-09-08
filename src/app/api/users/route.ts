import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Public-safe columns only — NEVER select password or email into a list every user can read.
const PUBLIC_COLUMNS =
  'id, name, username, avatar, coverImage, bio, course, faculty, yearOfStudy, interests, hobbies, isOnline, lastSeen, wingmanEnabled, createdAt';

export async function GET() {
  const db = await getDb();
  const users = await db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users`).all();
  return NextResponse.json(users.map((u: any) => ({
    ...u,
    interests: JSON.parse(u.interests || '[]'),
    hobbies: JSON.parse(u.hobbies || '[]'),
    isOnline: !!u.isOnline,
    wingmanEnabled: !!u.wingmanEnabled,
  })));
}
