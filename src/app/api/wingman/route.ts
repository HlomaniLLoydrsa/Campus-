import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

// GET /api/wingman?userId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const db = getDb();
  const rows = db.prepare('SELECT * FROM wingman_suggestions WHERE forUserId = ? OR wingmanId = ? ORDER BY createdAt DESC').all(userId, userId);
  return NextResponse.json(rows);
}

// POST /api/wingman
export async function POST(request: Request) {
  const body = await request.json();
  const { wingmanId, forUserId, suggestedUserId, reason } = body;
  if (!wingmanId || !forUserId || !suggestedUserId || !reason?.trim()) return NextResponse.json({ error: 'All fields required' }, { status: 400 });

  const db = getDb();
  const id = `ws_${crypto.randomUUID().slice(0, 8)}`;
  db.prepare('INSERT INTO wingman_suggestions (id, wingmanId, forUserId, suggestedUserId, reason, status) VALUES (?, ?, ?, ?, ?, ?)').run(id, wingmanId, forUserId, suggestedUserId, reason.trim(), 'pending');

  // Notify the person they made a suggestion for
  const wingman = db.prepare('SELECT name FROM users WHERE id = ?').get(wingmanId) as any;
  const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
  db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, read) VALUES (?, ?, ?, ?, ?, 0)').run(nid, forUserId, 'wingman-activity', wingmanId, `${wingman?.name || 'A friend'} made a wingman suggestion for you 🏹`);

  return NextResponse.json({ id, wingmanId, forUserId, suggestedUserId, reason, status: 'pending' }, { status: 201 });
}

// PATCH /api/wingman
export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, action } = body; // accepted | rejected
  const db = getDb();
  db.prepare('UPDATE wingman_suggestions SET status = ? WHERE id = ?').run(action, id);
  return NextResponse.json({ success: true });
}
