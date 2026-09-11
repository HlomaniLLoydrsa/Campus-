import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';
import { REPORT_REASONS } from '@/lib/reports';

// POST /api/reports — report content AS the authenticated user.
// Requires a reason (from the allowed categories). Optional free-text description.
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const reporterId = auth;

  const body = await request.json();
  const { targetType, targetId } = body;
  const reason = (body.reason || '').toString().trim();
  const description = (body.description || '').toString().trim();

  if (!targetType || !targetId) {
    return NextResponse.json({ error: 'targetType and targetId are required' }, { status: 400 });
  }
  // Prevent empty reports — a reason from the known list is required.
  if (!reason || !REPORT_REASONS.some(r => r.value === reason)) {
    return NextResponse.json({ error: 'Please choose a reason for reporting' }, { status: 400 });
  }

  const db = await getDb();

  // Idempotency: one pending report per (reporter, target). Re-reporting updates the reason.
  const id = `rep_${reporterId}_${targetType}_${targetId}`.slice(0, 120);
  await db.prepare(
    `INSERT INTO reports (id, reporterId, targetType, targetId, reason, description, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')
     ON CONFLICT(id) DO UPDATE SET reason = excluded.reason, description = excluded.description, status = 'pending'`
  ).run(id, reporterId, targetType, targetId, reason, description);

  return NextResponse.json({ id, success: true }, { status: 201 });
}
