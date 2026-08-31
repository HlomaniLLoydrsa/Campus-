import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// POST /api/posts/:id/respond — respond to an "I Saw You" post ("that's me")
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const db = getDb();
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any;
  if (!post || !post.iSawYouData) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  const iSawYouData = JSON.parse(post.iSawYouData);
  if (!iSawYouData.respondents.includes(userId)) {
    iSawYouData.respondents.push(userId);
    db.prepare('INSERT OR IGNORE INTO isawyou_responses (postId, userId) VALUES (?, ?)').run(id, userId);
    db.prepare('UPDATE posts SET iSawYouData = ? WHERE id = ?').run(JSON.stringify(iSawYouData), id);

    // Notify the post author — this is meaningful (someone thinks it's about them)
    if (post.authorId && post.authorId !== userId) {
      const nid = `n_${Date.now()}`;
      db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, read) VALUES (?, ?, ?, ?, ?, 0)').run(nid, post.authorId, 'mention', userId, 'Someone thinks your "I Saw You" post is about them 👀');
    }
  }

  return NextResponse.json({ success: true, iSawYouData });
}
