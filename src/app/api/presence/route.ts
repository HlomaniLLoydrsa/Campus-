import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId, getSessionUserId } from '@/lib/auth';
import { getHiddenUserIds } from '@/lib/blocks';
import { PRESENCE_TTL_MINUTES, isValidLocation } from '@/lib/presence';

// GET /api/presence
// Returns the viewer's own check-in plus their friends' active check-ins,
// scoped to the viewer's university and with blocked users filtered out.
export async function GET() {
  const viewerId = await getSessionUserId();
  if (!viewerId) return NextResponse.json({ me: null, friends: [] });

  const db = await getDb();
  const now = new Date().toISOString();

  // The viewer's own current presence (if any, and not expired).
  const meRow = await db
    .prepare('SELECT userId, location, note, updatedAt, expiresAt FROM presence WHERE userId = ? AND expiresAt > ?')
    .get(viewerId, now);

  // The viewer's university, used to scope who they can see on the map.
  const viewer = await db.prepare('SELECT university FROM users WHERE id = ?').get(viewerId);
  const viewerUni = viewer?.university || null;

  // Accepted friends (connections rows are bidirectional; a row here = accepted).
  const friendRows = await db
    .prepare("SELECT connectedUserId FROM connections WHERE userId = ? AND type = 'friend'")
    .all(viewerId);
  const friendIds: string[] = friendRows.map((r: any) => r.connectedUserId);

  if (friendIds.length === 0) {
    return NextResponse.json({ me: meRow || null, friends: [] });
  }

  const hidden = await getHiddenUserIds(viewerId);

  // Active presence rows for those friends, joined to a little user info for display.
  const placeholders = friendIds.map(() => '?').join(',');
  const rows = await db
    .prepare(
      `SELECT p.userId, p.location, p.note, p.updatedAt, p.expiresAt,
              u.name AS name, u.username AS username, u.avatar AS avatar, u.university AS university
         FROM presence p
         JOIN users u ON u.id = p.userId
        WHERE p.userId IN (${placeholders})
          AND p.expiresAt > ?
        ORDER BY p.updatedAt DESC`
    )
    .all(...friendIds, now);

  const friends = (rows as any[])
    .filter(r => !hidden.has(r.userId))
    // Same-university only when the viewer has a university set; otherwise show all friends.
    .filter(r => !viewerUni || (r.university || null) === viewerUni)
    .map(r => ({
      userId: r.userId,
      name: r.name,
      username: r.username,
      avatar: r.avatar || null,
      location: r.location,
      note: r.note || '',
      updatedAt: r.updatedAt,
      expiresAt: r.expiresAt,
    }));

  return NextResponse.json({ me: meRow || null, friends });
}

// POST /api/presence — check in (or refresh) at a named campus location.
// Body: { location: string, note?: string }
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await request.json().catch(() => ({}));
  if (!isValidLocation(body.location)) {
    return NextResponse.json({ error: 'Unknown location.' }, { status: 400 });
  }
  const note = typeof body.note === 'string' ? body.note.slice(0, 120) : '';

  const db = await getDb();
  const now = new Date();
  const updatedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + PRESENCE_TTL_MINUTES * 60_000).toISOString();

  // Snapshot the user's university so the map can scope without a join at read time.
  const user = await db.prepare('SELECT university FROM users WHERE id = ?').get(userId);
  const university = user?.university || null;

  // Upsert: one presence row per user.
  await db
    .prepare(
      `INSERT INTO presence (userId, location, note, university, updatedAt, expiresAt)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(userId) DO UPDATE SET
         location = excluded.location,
         note = excluded.note,
         university = excluded.university,
         updatedAt = excluded.updatedAt,
         expiresAt = excluded.expiresAt`
    )
    .run(userId, body.location, note, university, updatedAt, expiresAt);

  return NextResponse.json({ location: body.location, note, updatedAt, expiresAt }, { status: 201 });
}

// DELETE /api/presence — check out (remove the viewer's presence).
export async function DELETE() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const db = await getDb();
  await db.prepare('DELETE FROM presence WHERE userId = ?').run(userId);
  return NextResponse.json({ ok: true });
}
