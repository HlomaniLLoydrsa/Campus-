import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';

// POST /api/reports — report content AS the authenticated user
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const reporterId = auth;

  const body = await request.json();
  const { targetType, targetId, reason } = body;
  if (!targetType || !targetId) {
    return NextResponse.json({ error: 'targetType, targetId required' }, { status: 400 });
  }
  const db = await getDb();
  const id = `rep_${crypto.randomUUID().slice(0, 8)}`;
  await db.prepare('INSERT INTO reports (id, reporterId, targetType, targetId, reason) VALUES (?, ?, ?, ?, ?)').run(
    id, reporterId, targetType, targetId, reason || ''
  );
  return NextResponse.json({ id, success: true }, { status: 201 });
}
