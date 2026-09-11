import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';

// Actor's display name for notification copy.
async function actorName(db: any, userId: string): Promise<string> {
  const u = await db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
  return u?.name || 'Someone';
}

// PATCH /api/posts/:id — like, save, comment, share, removeImage (as the authenticated user)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await request.json();
  const { action, content } = body;
  const db = await getDb();

  const post = await db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any;
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  // The post owner (works for anonymous posts too, matched via ownerId).
  const ownerId = post.ownerId || post.authorId;

  if (action === 'like') {
    const likedBy = JSON.parse(post.likedBy || '[]');
    const isLiked = likedBy.includes(userId);
    const newLikedBy = isLiked ? likedBy.filter((u: string) => u !== userId) : [...likedBy, userId];
    await db.prepare('UPDATE posts SET likedBy = ?, likes = ? WHERE id = ?').run(JSON.stringify(newLikedBy), newLikedBy.length, id);
    // Notify the owner on a NEW like (never self, never anonymous authors we can't resolve).
    // Deterministic id per (post, liker) so repeated like/unlike/like never spams; removed on unlike.
    if (ownerId && ownerId !== userId) {
      const nid = `nlk_${id}_${userId}`;
      if (isLiked) {
        await db.prepare('DELETE FROM notifications WHERE id = ?').run(nid);
      } else {
        await db.prepare('INSERT OR IGNORE INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(
          nid, ownerId, 'like', userId, `${await actorName(db, userId)} liked your post`, id, 'post'
        );
      }
    }
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
    if (ownerId && ownerId !== userId) {
      const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
      await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(
        nid, ownerId, 'share', userId, `${await actorName(db, userId)} shared your post`, id, 'post'
      );
    }
    return NextResponse.json({ shares });
  }

  if (action === 'removeImage') {
    // The real owner can remove an image, even from an anonymous post
    const owner = post.ownerId || post.authorId;
    if (!owner || owner !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    const images: string[] = JSON.parse(post.images || '[]');
    const { imageUrl } = body;
    const newImages = images.filter((img) => img !== imageUrl);
    await db.prepare('UPDATE posts SET images = ? WHERE id = ?').run(JSON.stringify(newImages), id);
    return NextResponse.json({ images: newImages });
  }

  if (action === 'comment' && content) {
    const commentId = `c_${Date.now()}`;
    // A reply references a parent comment on the same post (threaded). Validate the parent exists.
    let parentId: string | null = null;
    let parentAuthorId: string | null = null;
    if (body.parentId) {
      const parent = await db.prepare('SELECT id, authorId, postId FROM comments WHERE id = ?').get(body.parentId) as any;
      if (parent && parent.postId === id) { parentId = parent.id; parentAuthorId = parent.authorId; }
    }
    await db.prepare('INSERT INTO comments (id, postId, authorId, content, likes, likedBy, parentId, createdAt) VALUES (?, ?, ?, ?, 0, ?, ?, ?)').run(commentId, id, userId, content, '[]', parentId, new Date().toISOString());

    const name = await actorName(db, userId);
    if (parentId) {
      // Reply → notify the parent comment's author (unless it's you). relatedId=postId opens the post.
      if (parentAuthorId && parentAuthorId !== userId) {
        const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
        await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(
          nid, parentAuthorId, 'reply', userId, `${name} replied to your comment`, id, 'post'
        );
      }
      // Also let the post owner know there's new activity (unless owner is you or the parent author already notified).
      if (ownerId && ownerId !== userId && ownerId !== parentAuthorId) {
        const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
        await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(
          nid, ownerId, 'comment', userId, `${name} replied on your post`, id, 'post'
        );
      }
    } else if (ownerId && ownerId !== userId) {
      // Top-level comment → notify the post owner.
      const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
      await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(
        nid, ownerId, 'comment', userId, `${name} commented on your post`, id, 'post'
      );
    }
    return NextResponse.json({ id: commentId, postId: id, authorId: userId, content, likes: 0, likedBy: [], parentId, createdAt: new Date().toISOString() });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// DELETE /api/posts/:id — delete your own post (owner derived from session)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const db = await getDb();

  const post = await db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any;
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  // The real owner can delete their post — including anonymous ones (matched via ownerId)
  const owner = post.ownerId || post.authorId;
  if (owner && owner !== userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  await db.prepare('DELETE FROM comments WHERE postId = ?').run(id);
  await db.prepare("DELETE FROM notifications WHERE relatedType = 'post' AND relatedId = ?").run(id);
  await db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
