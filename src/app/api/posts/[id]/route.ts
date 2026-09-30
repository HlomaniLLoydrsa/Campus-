import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';
import { deletePostCascade } from '@/lib/admin';

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

  // Reactions ARE likes. A user has AT MOST ONE reaction (an emoji). 'like' is just
  // a reaction with the default heart. likedBy = everyone who reacted with anything;
  // likes = that count. reactions = emoji -> userIds, each user in exactly one bucket.
  const DEFAULT_REACTION = '❤️';
  if (action === 'like' || action === 'react') {
    const emoji = action === 'like'
      ? DEFAULT_REACTION
      : (body.emoji || '').toString();
    if (!emoji || emoji.length > 8) return NextResponse.json({ error: 'emoji required' }, { status: 400 });

    let reactions: Record<string, string[]> = {};
    try { reactions = post.reactions ? JSON.parse(post.reactions) : {}; } catch { reactions = {}; }

    // What (if anything) is the user's current reaction?
    let currentEmoji: string | null = null;
    for (const [e, ids] of Object.entries(reactions)) {
      if ((ids as string[]).includes(userId)) { currentEmoji = e; break; }
    }
    // Remove the user from every bucket first (one reaction per user).
    for (const e of Object.keys(reactions)) {
      reactions[e] = (reactions[e] as string[]).filter(u => u !== userId);
      if (reactions[e].length === 0) delete reactions[e];
    }
    // Tapping the SAME reaction again removes it (toggle off). Otherwise set the new one.
    const removing = currentEmoji === emoji;
    if (!removing) {
      reactions[emoji] = [...(reactions[emoji] || []), userId];
    }

    // likedBy = union of all reactor ids; likes = count.
    const reactorSet = new Set<string>();
    for (const ids of Object.values(reactions)) for (const u of ids as string[]) reactorSet.add(u);
    const newLikedBy = Array.from(reactorSet);

    await db.prepare('UPDATE posts SET reactions = ?, likedBy = ?, likes = ? WHERE id = ?')
      .run(JSON.stringify(reactions), JSON.stringify(newLikedBy), newLikedBy.length, id);

    // Notify the owner when a user reacts (not on removal, never self). One notif per (post, reactor).
    if (ownerId && ownerId !== userId) {
      const nid = `nlk_${id}_${userId}`;
      if (removing) {
        await db.prepare('DELETE FROM notifications WHERE id = ?').run(nid);
      } else {
        await db.prepare('INSERT OR IGNORE INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(
          nid, ownerId, 'like', userId, `${await actorName(db, userId)} reacted to your post`, id, 'post'
        );
      }
    }

    return NextResponse.json({ likes: newLikedBy.length, likedBy: newLikedBy, reactions });
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

  if (action === 'edit') {
    // Only the real owner may edit — works for anonymous posts too (matched via ownerId).
    if (!ownerId || ownerId !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    const newContent = typeof body.content === 'string' ? body.content.trim() : post.content;
    const hasImages = JSON.parse(post.images || '[]').length > 0;
    const hasEvent = !!post.eventData;
    // Content may be empty only if the post carries images or event data.
    if (!newContent && !hasImages && !hasEvent && !body.eventData) {
      return NextResponse.json({ error: 'Post cannot be empty' }, { status: 400 });
    }
    const editedAt = new Date().toISOString();
    if (body.eventData !== undefined) {
      // Event edit — merge the provided fields into existing eventData, preserving participants.
      let existing: any = {};
      try { existing = post.eventData ? JSON.parse(post.eventData) : {}; } catch { existing = {}; }
      const merged = { ...existing, ...body.eventData, participants: existing.participants || [], pendingRequests: existing.pendingRequests || [], currentParticipants: existing.currentParticipants ?? (existing.participants?.length || 0) };
      await db.prepare('UPDATE posts SET content = ?, eventData = ?, editedAt = ? WHERE id = ?').run(newContent, JSON.stringify(merged), editedAt, id);
    } else {
      await db.prepare('UPDATE posts SET content = ?, editedAt = ? WHERE id = ?').run(newContent, editedAt, id);
    }
    return NextResponse.json({ success: true, content: newContent, editedAt });
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
  await deletePostCascade(id);
  return NextResponse.json({ success: true });
}
