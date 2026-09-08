import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';

// GET /api/posts
export async function GET() {
  const db = await getDb();
  const posts = await db.prepare('SELECT * FROM posts ORDER BY createdAt DESC').all();
  const comments = await db.prepare('SELECT * FROM comments ORDER BY createdAt ASC').all();

  const commentsByPost: Record<string, any[]> = {};
  for (const c of comments as any[]) {
    if (!commentsByPost[c.postId]) commentsByPost[c.postId] = [];
    commentsByPost[c.postId].push({ ...c, likedBy: JSON.parse(c.likedBy || '[]') });
  }

  return NextResponse.json(posts.map((p: any) => ({
    ...p,
    isAnonymous: !!p.isAnonymous,
    ownerId: p.ownerId || p.authorId || null,
    images: JSON.parse(p.images || '[]'),
    likedBy: JSON.parse(p.likedBy || '[]'),
    savedBy: JSON.parse(p.savedBy || '[]'),
    comments: commentsByPost[p.id] || [],
    eventData: p.eventData ? JSON.parse(p.eventData) : undefined,
    iSawYouData: p.iSawYouData ? JSON.parse(p.iSawYouData) : undefined,
  })));
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
