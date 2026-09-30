import { getDb } from '@/lib/db';

export const GROUP_NAME_MAX = 60;
export const GROUP_DESC_MAX = 300;

export interface GroupRow {
  id: string;
  type: string;
  name: string | null;
  description: string | null;
  image: string | null;
  privacy: string | null;
  participants: string[];
  adminIds: string[];
  inviteCode: string | null;
  createdAt: string;
}

function parseJsonArray(s: unknown): string[] {
  if (!s) return [];
  try { const a = JSON.parse(s as string); return Array.isArray(a) ? a : []; } catch { return []; }
}

/** Load a group conversation with participants/adminIds parsed, or null if not a group. */
export async function getGroup(id: string): Promise<GroupRow | null> {
  const db = await getDb();
  const row = await db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as any;
  if (!row || row.type !== 'group') return null;
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description ?? null,
    image: row.image ?? null,
    privacy: row.privacy ?? 'private',
    participants: parseJsonArray(row.participants),
    adminIds: parseJsonArray(row.adminIds),
    inviteCode: row.inviteCode ?? null,
    createdAt: row.createdAt,
  };
}

export function isMember(group: GroupRow, userId: string): boolean {
  return group.participants.includes(userId);
}

export function isAdmin(group: GroupRow, userId: string): boolean {
  return group.adminIds.includes(userId);
}

/** Persist participants + adminIds back to the conversation row. */
export async function saveGroupMembership(id: string, participants: string[], adminIds: string[]) {
  const db = await getDb();
  await db.prepare('UPDATE conversations SET participants = ?, adminIds = ? WHERE id = ?')
    .run(JSON.stringify(participants), JSON.stringify(adminIds), id);
}
