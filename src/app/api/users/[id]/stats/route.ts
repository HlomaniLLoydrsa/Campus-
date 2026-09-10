import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/users/:id/stats — public counts for a profile (connections, posts, badges).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();

  const conn = await db.prepare('SELECT COUNT(*) as c FROM connections WHERE userId = ?').get(id) as any;
  // Only non-anonymous posts count toward the public "posts" number.
  const postCount = await db.prepare("SELECT COUNT(*) as c FROM posts WHERE authorId = ? AND isAnonymous = 0").get(id) as any;
  const badgeCount = await db.prepare('SELECT COUNT(*) as c FROM badges WHERE userId = ?').get(id) as any;

  return NextResponse.json({
    connections: conn?.c || 0,
    posts: postCount?.c || 0,
    badges: badgeCount?.c || 0,
  });
}
