import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// POST /api/auth/register — register or ensure user exists in DB
export async function POST(request: Request) {
  const body = await request.json();
  const { id, name, username } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const db = await getDb();
  const existing = await db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;

  if (existing) {
    // User already exists, return their data
    return NextResponse.json({
      ...existing,
      interests: JSON.parse(existing.interests || '[]'),
      hobbies: JSON.parse(existing.hobbies || '[]'),
      isOnline: !!existing.isOnline,
      wingmanEnabled: !!existing.wingmanEnabled,
    });
  }

  // Create new user
  await db.prepare('INSERT INTO users (id, name, username, isOnline) VALUES (?, ?, ?, 1)').run(
    id, name || '', username || ''
  );

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  return NextResponse.json({
    ...user,
    interests: JSON.parse(user.interests || '[]'),
    hobbies: JSON.parse(user.hobbies || '[]'),
    isOnline: !!user.isOnline,
    wingmanEnabled: !!user.wingmanEnabled,
  }, { status: 201 });
}
