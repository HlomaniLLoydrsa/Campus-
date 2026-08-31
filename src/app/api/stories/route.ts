import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

// GET /api/stories — get all active stories (less than 24h old)
export async function GET() {
  const db = await getDb();

  // Ensure stories table exists
  await db.exec(`CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    content TEXT,
    image TEXT,
    backgroundColor TEXT DEFAULT '#6C5CE7',
    createdAt TEXT DEFAULT (datetime('now')),
    expiresAt TEXT NOT NULL,
    views TEXT DEFAULT '[]',
    FOREIGN KEY (userId) REFERENCES users(id)
  )`);

  // Get stories that haven't expired
  const now = new Date().toISOString();
  const stories = await db.prepare("SELECT * FROM stories WHERE expiresAt > ? ORDER BY createdAt DESC").all(now);

  return NextResponse.json(stories.map((s: any) => ({
    ...s,
    views: JSON.parse(s.views || '[]'),
  })));
}

// POST /api/stories — create a new story (expires in 24h)
export async function POST(request: Request) {
  const body = await request.json();
  const { userId, content, image, backgroundColor } = body;

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
  if (!content && !image) return NextResponse.json({ error: 'content or image required' }, { status: 400 });

  const db = await getDb();

  // Ensure table exists
  await db.exec(`CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    content TEXT,
    image TEXT,
    backgroundColor TEXT DEFAULT '#6C5CE7',
    createdAt TEXT DEFAULT (datetime('now')),
    expiresAt TEXT NOT NULL,
    views TEXT DEFAULT '[]',
    FOREIGN KEY (userId) REFERENCES users(id)
  )`);

  const id = `story_${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await db.prepare('INSERT INTO stories (id, userId, content, image, backgroundColor, createdAt, expiresAt, views) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, userId, content || null, image || null, backgroundColor || '#6C5CE7', createdAt, expiresAt, '[]'
  );

  return NextResponse.json({ id, userId, content, image, backgroundColor, createdAt, expiresAt, views: [] }, { status: 201 });
}
