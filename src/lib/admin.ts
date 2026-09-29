import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export interface AdminContext {
  userId: string;
}

/**
 * Require an authenticated admin. Returns { userId } for a verified admin,
 * or a NextResponse (401 if not signed in, 403 if signed in but not an admin)
 * that the route should return immediately.
 *
 * Authorization is checked SERVER-SIDE against users.isAdmin — never trust the
 * client. Suspended admins are also rejected.
 *
 * Usage:
 *   const admin = await requireAdmin();
 *   if (admin instanceof NextResponse) return admin;
 *   const { userId } = admin;
 */
export async function requireAdmin(): Promise<AdminContext | NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }
  const db = await getDb();
  const user = await db.prepare('SELECT isAdmin, status FROM users WHERE id = ?').get(userId) as any;
  if (!user || !user.isAdmin || user.status === 'suspended') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }
  return { userId };
}

/**
 * Fully delete a post and all rows that reference it. Used by both the owner
 * delete route and the admin delete route so cleanup stays consistent.
 */
export async function deletePostCascade(postId: string) {
  const db = await getDb();
  await db.prepare('DELETE FROM comments WHERE postId = ?').run(postId);
  await db.prepare("DELETE FROM notifications WHERE relatedType = 'post' AND relatedId = ?").run(postId);
  await db.prepare('DELETE FROM event_participants WHERE postId = ?').run(postId);
  // Clear any reports that targeted this post so the moderation queue stays clean.
  await db.prepare("DELETE FROM reports WHERE targetType = 'post' AND targetId = ?").run(postId);
  await db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
}

/**
 * Fully delete a user and the data tied to them across tables. Anonymous posts
 * are matched by ownerId (not just authorId) so they're removed too.
 */
export async function deleteUserCascade(userId: string) {
  const db = await getDb();
  // Remove the user's posts (incl. anonymous, matched via ownerId) with their cascades.
  const posts = await db.prepare('SELECT id FROM posts WHERE authorId = ? OR ownerId = ?').all(userId, userId) as any[];
  for (const p of posts) await deletePostCascade(p.id);

  await db.prepare('DELETE FROM comments WHERE authorId = ?').run(userId);
  await db.prepare('DELETE FROM notifications WHERE userId = ? OR fromUserId = ?').run(userId, userId);
  await db.prepare('DELETE FROM connections WHERE userId = ? OR connectedUserId = ?').run(userId, userId);
  await db.prepare('DELETE FROM connection_requests WHERE fromUserId = ? OR toUserId = ?').run(userId, userId);
  await db.prepare('DELETE FROM messages WHERE senderId = ?').run(userId);
  await db.prepare('DELETE FROM stories WHERE userId = ?').run(userId);
  await db.prepare('DELETE FROM reports WHERE reporterId = ?').run(userId);
  await db.prepare('DELETE FROM blocks WHERE blockerId = ? OR blockedId = ?').run(userId, userId);
  // Best-effort cleanup of feature tables keyed to the user. Ignore if a table is absent.
  const bestEffort = [
    "DELETE FROM marketplace_listings WHERE sellerId = ?",
    "DELETE FROM services WHERE providerId = ?",
    "DELETE FROM academy_resources WHERE uploaderId = ?",
    "DELETE FROM lost_found WHERE reporterId = ?",
    "DELETE FROM secret_admirers WHERE fromUserId = ? OR toUserId = ?",
  ];
  for (const sql of bestEffort) {
    try {
      const params = sql.includes('secret_admirers') ? [userId, userId] : [userId];
      await db.prepare(sql).run(...params);
    } catch { /* table may not exist / no rows — ignore */ }
  }
  await db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}
