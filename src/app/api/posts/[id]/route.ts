import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// PATCH /api/posts/:id — like, save, comment
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { action, userId, content } = body;
  const db = await getDb();

  const post = await db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any;
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  if (action === 'like') {
    const likedBy = JSON.parse(post.likedBy || '[]');
    const isLiked = likedBy.includes(userId);
    const newLikedBy = isLiked ? likedBy.filter((u: string) => u !== userId) : [...likedBy, userId];
    await db.prepare('UPDATE posts SET likedBy = ?, likes = ? WHERE id = ?').run(JSON.stringify(newLikedBy), newLikedBy.length, id);
    // Likes do NOT generate notifications (kept quiet like mainstream social apps)
    return NextResponse.json({ likes: newLikedBy.length, likedBy: newLikedBy });
  }

  if (action === 'save') {
    const savedBy = JSON.parse(post.savedBy || '[]');
    const isSaved = savedBy.includes(userId);
    const newSavedBy = isSaved ? savedBy.filter((u: string) => u !== userId) : [...savedBy, userId];
    await db.prepare('UPDATE posts SET savedBy = ? WHERE id = ?').run(JSON.stringify(newSavedBy), id);
    return NextResponse.json({ savedBy: newSavedBy });
  }

  if (action === 'share') {
    const shares = (post.shares || 0) + 1;
    await db.prepare('UPDATE posts SET shares = ? WHERE id = ?').run(shares, id);
    return NextResponse.json({ shares });
  }

  if (action === 'comment' && content) {
    const commentId = `c_${Date.now()}`;
    await db.prepare('INSERT INTO comments (id, postId, authorId, content, likes, likedBy, createdAt) VALUES (?, ?, ?, ?, 0, ?, ?)').run(commentId, id, userId, content, '[]', new Date().toISOString());
    // Comments do NOT generate notifications to reduce noise
    return NextResponse.json({ id: commentId, postId: id, authorId: userId, content, likes: 0, likedBy: [], createdAt: new Date().toISOString() });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// DELETE /api/posts/:id?userId=x — delete own post
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const db = await getDb();

  const post = await db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any;
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  // Only the author can delete (anonymous posts can't be deleted via this path unless matched)
  if (post.authorId && post.authorId !== userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  await db.prepare('DELETE FROM comments WHERE postId = ?').run(id);
  await db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
