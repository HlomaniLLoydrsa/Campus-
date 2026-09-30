import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

// GET /api/groups/discover — discoverable groups the authenticated user is NOT already in.
export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const db = await getDb();
  const rows = await db.prepare("SELECT * FROM conversations WHERE type = 'group' AND privacy = 'discoverable' ORDER BY createdAt DESC LIMIT 100").all() as any[];

  const out = [];
  for (const r of rows) {
    let participants: string[] = [];
    try { participants = JSON.parse(r.participants || '[]'); } catch { participants = []; }
    if (participants.includes(userId)) continue; // already a member — not for discovery
    out.push({
      id: r.id,
      name: r.name,
      description: r.description || '',
      image: r.image || '',
      memberCount: participants.length,
    });
  }
  return NextResponse.json(out);
}
