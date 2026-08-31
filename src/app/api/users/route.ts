import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const users = db.prepare('SELECT * FROM users').all();
  return NextResponse.json(users.map((u: any) => ({
    ...u,
    interests: JSON.parse(u.interests || '[]'),
    hobbies: JSON.parse(u.hobbies || '[]'),
    isOnline: !!u.isOnline,
    wingmanEnabled: !!u.wingmanEnabled,
  })));
}
