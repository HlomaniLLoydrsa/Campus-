import { getDb } from '@/lib/db';

/**
 * All user ids that should be mutually hidden from `userId`: anyone they've
 * blocked, AND anyone who has blocked them. Blocking is symmetric for visibility
 * and interaction — neither party should see or reach the other.
 */
export async function getHiddenUserIds(userId: string): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.prepare(
    'SELECT blockerId, blockedId FROM blocks WHERE blockerId = ? OR blockedId = ?'
  ).all(userId, userId) as any[];
  const hidden = new Set<string>();
  for (const r of rows) {
    if (r.blockerId === userId) hidden.add(r.blockedId);
    if (r.blockedId === userId) hidden.add(r.blockerId);
  }
  return hidden;
}

/** True if either user has blocked the other. */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.prepare(
    'SELECT 1 FROM blocks WHERE (blockerId = ? AND blockedId = ?) OR (blockerId = ? AND blockedId = ?) LIMIT 1'
  ).get(a, b, b, a);
  return !!row;
}
