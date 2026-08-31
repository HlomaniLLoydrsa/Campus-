import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

// GET /api/requests?userId=u1 — get all pending requests for/from a user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const db = getDb();
  const requests = db.prepare(
    'SELECT * FROM connection_requests WHERE (fromUserId = ? OR toUserId = ?) AND status = ?'
  ).all(userId, userId, 'pending');
  return NextResponse.json(requests);
}

// POST /api/requests — send a new connection request
export async function POST(request: Request) {
  const body = await request.json();
  const { fromUserId, toUserId, type } = body;

  if (!fromUserId || !toUserId || !type) {
    return NextResponse.json({ error: 'fromUserId, toUserId, and type are required' }, { status: 400 });
  }
  if (fromUserId === toUserId) {
    return NextResponse.json({ error: 'Cannot send request to yourself' }, { status: 400 });
  }
  if (type !== 'friend' && type !== 'relationship') {
    return NextResponse.json({ error: 'type must be friend or relationship' }, { status: 400 });
  }

  const db = getDb();

  // Check if already connected
  const existing = db.prepare('SELECT * FROM connections WHERE userId = ? AND connectedUserId = ?').get(fromUserId, toUserId);
  if (existing) {
    return NextResponse.json({ error: 'Already connected' }, { status: 409 });
  }

  // Check for existing pending request
  const pendingRequest = db.prepare(
    'SELECT * FROM connection_requests WHERE ((fromUserId = ? AND toUserId = ?) OR (fromUserId = ? AND toUserId = ?)) AND status = ?'
  ).get(fromUserId, toUserId, toUserId, fromUserId, 'pending');
  if (pendingRequest) {
    return NextResponse.json({ error: 'A pending request already exists' }, { status: 409 });
  }

  // Create the request
  const id = `cr_${crypto.randomUUID().slice(0, 8)}`;
  db.prepare('INSERT INTO connection_requests (id, fromUserId, toUserId, type, status) VALUES (?, ?, ?, ?, ?)').run(id, fromUserId, toUserId, type, 'pending');

  // Get sender's name for notification
  const sender = db.prepare('SELECT name FROM users WHERE id = ?').get(fromUserId) as any;
  const senderName = sender?.name || 'Someone';

  // Create notification for recipient
  const notifId = `n_${crypto.randomUUID().slice(0, 8)}`;
  const notifMessage = type === 'friend'
    ? `${senderName} sent you a friend request`
    : `${senderName} sent you a relationship request`;
  const notifType = type === 'friend' ? 'friend-request' : 'relationship-request';

  db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, requestType, read) VALUES (?, ?, ?, ?, ?, ?, ?)').run(notifId, toUserId, notifType, fromUserId, notifMessage, type, 0);

  return NextResponse.json({ id, fromUserId, toUserId, type, status: 'pending', notification: { id: notifId, message: notifMessage } }, { status: 201 });
}
