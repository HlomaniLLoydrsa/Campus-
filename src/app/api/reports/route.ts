import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

// POST /api/reports — report a post, user, comment, event, or message
export async function POST(request: Request) {
  const body = await request.json();
  const { reporterId, targetType, targetId, reason } = body;
  if (!reporterId || !targetType || !targetId) {
    return NextResponse.json({ error: 'reporterId, targetType, targetId required' }, { status: 400 });
  }
  const db = await getDb();
  const id = `rep_${crypto.randomUUID().slice(0, 8)}`;
  await db.prepare('INSERT INTO reports (id, reporterId, targetType, targetId, reason) VALUES (?, ?, ?, ?, ?)').run(
    id, reporterId, targetType, targetId, reason || ''
  );
  return NextResponse.json({ id, success: true }, { status: 201 });
}
