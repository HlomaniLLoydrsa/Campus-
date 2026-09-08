import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

// POST /api/posts/:id/respond — respond to an "I Saw You" post ("that's me") as the authenticated user
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const db = await getDb();
  const post = await db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any;
  if (!post || !post.iSawYouData) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  const iSawYouData = JSON.parse(post.iSawYouData);
  if (!iSawYouData.respondents.includes(userId)) {
    iSawYouData.respondents.push(userId);
    await db.prepare('INSERT OR IGNORE INTO isawyou_responses (postId, userId) VALUES (?, ?)').run(id, userId);
    await db.prepare('UPDATE posts SET iSawYouData = ? WHERE id = ?').run(JSON.stringify(iSawYouData), id);

    // Notify the post author — this is meaningful (someone thinks it's about them)
    if (post.authorId && post.authorId !== userId) {
      const nid = `n_${Date.now()}`;
      await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(nid, post.authorId, 'mention', userId, 'Someone thinks your "I Saw You" post is about them 👀', post.id, 'post');
    }
  }

  return NextResponse.json({ success: true, iSawYouData });
}
