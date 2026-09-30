import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

function parseArr(s: unknown): string[] {
  if (!s) return [];
  try { const a = JSON.parse(s as string); return Array.isArray(a) ? a : []; } catch { return []; }
}

// GET /api/groups/join?code=... — preview a group from an invite code (auth required).
export async function GET(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const code = (new URL(request.url).searchParams.get('code') || '').trim();
  if (!code) return NextResponse.json({ error: 'Invite code required' }, { status: 400 });

  const db = await getDb();
  const row = await db.prepare("SELECT * FROM conversations WHERE type = 'group' AND inviteCode = ?").get(code) as any;
  if (!row) return NextResponse.json({ error: 'This invite link is invalid or has expired.' }, { status: 404 });

  const participants = parseArr(row.participants);
  return NextResponse.json({
    id: row.id,
    name: row.name,
    description: row.description || '',
    image: row.image || '',
    memberCount: participants.length,
    alreadyMember: participants.includes(userId),
  });
}

// POST /api/groups/join  { code } — join a group via a shared invite link.
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { code } = await request.json().catch(() => ({}));
  if (!code) return NextResponse.json({ error: 'Invite code required' }, { status: 400 });

  const db = await getDb();
  const row = await db.prepare("SELECT * FROM conversations WHERE type = 'group' AND inviteCode = ?").get(code) as any;
  if (!row) return NextResponse.json({ error: 'This invite link is invalid or has expired.' }, { status: 404 });

  const participants = parseArr(row.participants);
  if (participants.includes(userId)) {
    return NextResponse.json({ id: row.id, success: true, alreadyMember: true });
  }
  const next = Array.from(new Set([...participants, userId]));
  await db.prepare('UPDATE conversations SET participants = ? WHERE id = ?').run(JSON.stringify(next), row.id);
  return NextResponse.json({ id: row.id, success: true });
}
