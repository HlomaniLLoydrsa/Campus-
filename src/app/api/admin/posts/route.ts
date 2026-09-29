import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, deletePostCascade } from '@/lib/admin';

// GET /api/admin/posts?q=<search> — recent posts with author info (incl. real
// owner of anonymous posts, which only admins may see).
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();

  const db = await getDb();
  let rows: any[];
  if (q) {
    rows = await db.prepare(
      `SELECT id, type, authorId, ownerId, isAnonymous, content, likes, createdAt
       FROM posts WHERE LOWER(content) LIKE ? ORDER BY createdAt DESC LIMIT 100`
    ).all(`%${q}%`) as any[];
  } else {
    rows = await db.prepare(
      `SELECT id, type, authorId, ownerId, isAnonymous, content, likes, createdAt
       FROM posts ORDER BY createdAt DESC LIMIT 100`
    ).all() as any[];
  }

  // Resolve display names for authors / real owners.
  const ids = Array.from(new Set(rows.flatMap(r => [r.authorId, r.ownerId]).filter(Boolean)));
  const nameById: Record<string, string> = {};
  for (const id of ids) {
    const u = await db.prepare('SELECT name, username FROM users WHERE id = ?').get(id) as any;
    if (u) nameById[id] = u.name || u.username || id;
  }

  return NextResponse.json(rows.map(r => ({
    id: r.id, type: r.type, isAnonymous: !!r.isAnonymous, content: r.content, likes: r.likes || 0, createdAt: r.createdAt,
    authorName: r.authorId ? (nameById[r.authorId] || 'Unknown') : (r.isAnonymous ? 'Anonymous' : 'Unknown'),
    ownerName: r.ownerId ? (nameById[r.ownerId] || 'Unknown') : null,
  })));
}

// DELETE /api/admin/posts?postId=<id> — delete ANY post (incl. anonymous) + cascade.
export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');
  if (!postId) return NextResponse.json({ error: 'postId is required' }, { status: 400 });

  const db = await getDb();
  const post = await db.prepare('SELECT id FROM posts WHERE id = ?').get(postId) as any;
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  await deletePostCascade(postId);
  return NextResponse.json({ success: true });
}
