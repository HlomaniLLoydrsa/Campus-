import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';

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

// POST /api/stories — create a story AS the authenticated user (expires in 24h)
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await request.json();
  const { content, image, backgroundColor } = body;

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

// PATCH /api/stories — record a view, or comment on a story (friends only → owner's inbox)
export async function PATCH(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await request.json();
  const { storyId, action, comment } = body;
  if (!storyId) return NextResponse.json({ error: 'storyId required' }, { status: 400 });

  const db = await getDb();
  const story = await db.prepare('SELECT * FROM stories WHERE id = ?').get(storyId) as any;
  if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

  // Record a view — anyone may view; don't count the owner or duplicates.
  if (action === 'view') {
    if (userId !== story.userId) {
      const views: string[] = JSON.parse(story.views || '[]');
      if (!views.includes(userId)) {
        views.push(userId);
        await db.prepare('UPDATE stories SET views = ? WHERE id = ?').run(JSON.stringify(views), storyId);
      }
    }
    return NextResponse.json({ success: true });
  }

  // Comment — only FRIENDS of the story owner may comment; it goes to the owner's inbox.
  if (action === 'comment') {
    if (!comment?.trim()) return NextResponse.json({ error: 'comment required' }, { status: 400 });
    if (userId === story.userId) return NextResponse.json({ error: 'You cannot comment on your own story' }, { status: 400 });

    const friend = await db.prepare("SELECT 1 FROM connections WHERE userId = ? AND connectedUserId = ? AND type = 'friend'").get(userId, story.userId);
    if (!friend) return NextResponse.json({ error: 'Only friends can comment on this story' }, { status: 403 });

    const sender = await db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;

    // Deliver the comment to the owner's inbox as a message in their direct conversation.
    const all = await db.prepare("SELECT * FROM conversations WHERE type = 'direct'").all() as any[];
    let conv = all.find(c => {
      const parts = JSON.parse(c.participants || '[]');
      return parts.includes(userId) && parts.includes(story.userId);
    });
    let convId: string;
    if (conv) { convId = conv.id; }
    else {
      convId = `conv_${crypto.randomUUID().slice(0, 8)}`;
      await db.prepare('INSERT INTO conversations (id, type, participants) VALUES (?, ?, ?)').run(convId, 'direct', JSON.stringify([userId, story.userId]));
    }
    const mid = `m_${crypto.randomUUID().slice(0, 8)}`;
    const content = `💬 Replied to your story: "${comment.trim()}"`;
    await db.prepare('INSERT INTO messages (id, conversationId, senderId, content, read, createdAt) VALUES (?, ?, ?, ?, 0, ?)').run(mid, convId, userId, content, new Date().toISOString());

    // Notify the owner
    const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(nid, story.userId, 'new-message', userId, `${sender?.name || 'A friend'} replied to your story`, convId, 'conversation');

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
