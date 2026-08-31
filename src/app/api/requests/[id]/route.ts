import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

// PATCH /api/requests/:id — accept or reject a request
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { action, userId } = body; // action: 'accept' | 'reject' | 'cancel'

  if (!action || !userId) {
    return NextResponse.json({ error: 'action and userId required' }, { status: 400 });
  }

  const db = getDb();
  const req = db.prepare('SELECT * FROM connection_requests WHERE id = ?').get(id) as any;
  if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  if (req.status !== 'pending') return NextResponse.json({ error: 'Request is no longer pending' }, { status: 400 });

  if (action === 'cancel') {
    // Only sender can cancel
    if (req.fromUserId !== userId) return NextResponse.json({ error: 'Only sender can cancel' }, { status: 403 });
    db.prepare("UPDATE connection_requests SET status = 'cancelled' WHERE id = ?").run(id);
    return NextResponse.json({ success: true, action: 'cancelled' });
  }

  if (action === 'accept') {
    // Only recipient can accept
    if (req.toUserId !== userId) return NextResponse.json({ error: 'Only recipient can accept' }, { status: 403 });

    // Create bidirectional connection
    const connType = req.type; // 'friend' or 'relationship'
    db.prepare('INSERT OR IGNORE INTO connections (userId, connectedUserId, type) VALUES (?, ?, ?)').run(req.fromUserId, req.toUserId, connType);
    db.prepare('INSERT OR IGNORE INTO connections (userId, connectedUserId, type) VALUES (?, ?, ?)').run(req.toUserId, req.fromUserId, connType);

    // Update request status
    db.prepare("UPDATE connection_requests SET status = 'accepted' WHERE id = ?").run(id);

    // Notify the sender
    const accepter = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
    const notifId = `n_${crypto.randomUUID().slice(0, 8)}`;
    const notifType = req.type === 'friend' ? 'friend-accepted' : 'relationship-accepted';
    const msg = req.type === 'friend'
      ? `${accepter?.name} accepted your friend request`
      : `${accepter?.name} accepted your relationship request`;

    db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, requestType, read) VALUES (?, ?, ?, ?, ?, ?, ?)').run(notifId, req.fromUserId, notifType, userId, msg, req.type, 0);

    return NextResponse.json({ success: true, action: 'accepted', connectionType: connType });
  }

  if (action === 'reject') {
    if (req.toUserId !== userId) return NextResponse.json({ error: 'Only recipient can reject' }, { status: 403 });
    db.prepare("UPDATE connection_requests SET status = 'rejected' WHERE id = ?").run(id);
    return NextResponse.json({ success: true, action: 'rejected' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// DELETE /api/requests/:id — delete/cancel a request
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM connection_requests WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
