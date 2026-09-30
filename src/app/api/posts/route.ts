import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId, getSessionUserId } from '@/lib/auth';
import { getHiddenUserIds } from '@/lib/blocks';

// GET /api/posts
export async function GET() {
  const db = await getDb();
  // Who's asking — used so we NEVER leak the real author of an anonymous post,
  // and to hide posts from/to blocked users.
  const viewerId = await getSessionUserId();
  const hidden = viewerId ? await getHiddenUserIds(viewerId) : new Set<string>();
  const posts = await db.prepare('SELECT * FROM posts ORDER BY createdAt DESC').all();
  const comments = await db.prepare('SELECT * FROM comments ORDER BY createdAt ASC').all();

  const commentsByPost: Record<string, any[]> = {};
  for (const c of comments as any[]) {
    if (!commentsByPost[c.postId]) commentsByPost[c.postId] = [];
    commentsByPost[c.postId].push({ ...c, likedBy: JSON.parse(c.likedBy || '[]') });
  }

  const visible = (posts as any[]).filter(p => {
    const realOwner = p.ownerId || p.authorId || null;
    return !(realOwner && hidden.has(realOwner));
  });

  return NextResponse.json(visible.map((p: any) => {
    const realOwner = p.ownerId || p.authorId || null;
    const isAnon = !!p.isAnonymous;
    // For anonymous posts, only the owner themselves may see ownerId (so they keep
    // their manage/delete controls). Everyone else gets null — the real author is
    // never exposed. Non-anonymous posts already have a public authorId, no leak.
    const ownerId = isAnon ? (viewerId && viewerId === realOwner ? realOwner : null) : realOwner;
    return {
      ...p,
      isAnonymous: isAnon,
      // For anonymous posts, authorId is already null in the DB; never fall back to the real owner here.
      authorId: isAnon ? null : (p.authorId || null),
      ownerId,
      editedAt: p.editedAt || null,
      images: JSON.parse(p.images || '[]'),
      likedBy: JSON.parse(p.likedBy || '[]'),
      savedBy: JSON.parse(p.savedBy || '[]'),
      reactions: p.reactions ? (() => { try { return JSON.parse(p.reactions); } catch { return {}; } })() : {},
      comments: commentsByPost[p.id] || [],
      eventData: p.eventData ? JSON.parse(p.eventData) : undefined,
      iSawYouData: p.iSawYouData ? JSON.parse(p.iSawYouData) : undefined,
    };
  }));
}

// POST /api/posts — create a new post AS the authenticated user
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const sessionUserId = auth;

  const body = await request.json();
  const db = await getDb();
  // Respect client-provided id so optimistic UI stays in sync; otherwise generate one
  const id = body.id || `p_${crypto.randomUUID().slice(0, 8)}`;

  if (!body.content && (!body.images || body.images.length === 0)) {
    return NextResponse.json({ error: 'Post must have content or an image' }, { status: 400 });
  }

  // Identity is derived from the session, never trusted from the body.
  // ownerId always records the real author (even for anonymous posts) so the owner can manage it.
  const isAnonymous = !!body.isAnonymous;
  const authorId = isAnonymous ? null : sessionUserId;
  const ownerId = sessionUserId;

  await db.prepare('INSERT INTO posts (id, type, authorId, ownerId, isAnonymous, content, images, likes, likedBy, savedBy, createdAt, eventData, iSawYouData, taggedUserId) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)').run(
    id, body.type || 'normal', authorId, ownerId, isAnonymous ? 1 : 0,
    body.content || '', JSON.stringify(body.images || []), '[]', '[]',
    body.createdAt || new Date().toISOString(), body.eventData ? JSON.stringify(body.eventData) : null,
    body.iSawYouData ? JSON.stringify(body.iSawYouData) : null, body.taggedUserId || null
  );

  return NextResponse.json({ id, ...body, authorId, ownerId }, { status: 201 });
}
