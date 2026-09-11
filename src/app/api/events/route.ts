import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';

// POST /api/events — join/leave/approve/reject as the authenticated user
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await request.json();
  const { postId, action } = body; // action: join | leave | approve | reject
  if (!postId || !action) return NextResponse.json({ error: 'postId and action required' }, { status: 400 });

  const db = await getDb();
  const post = await db.prepare('SELECT * FROM posts WHERE id = ?').get(postId) as any;
  if (!post || !post.eventData) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  // The organizer is the real owner — works for anonymous events too (authorId is null then, ownerId holds identity).
  const organizerId = post.ownerId || post.authorId;

  let eventData: any;
  try { eventData = JSON.parse(post.eventData); } catch { return NextResponse.json({ error: 'Event data is corrupted' }, { status: 422 }); }
  // Defensive defaults so a partially-formed event never throws a 500.
  if (!Array.isArray(eventData.participants)) eventData.participants = [];
  if (!Array.isArray(eventData.pendingRequests)) eventData.pendingRequests = [];
  if (typeof eventData.currentParticipants !== 'number') eventData.currentParticipants = eventData.participants.length;
  if (typeof eventData.maxParticipants !== 'number') eventData.maxParticipants = Infinity;

  if (action === 'join') {
    if (eventData.participants.includes(userId)) return NextResponse.json({ error: 'Already joined' }, { status: 409 });
    if (eventData.currentParticipants >= eventData.maxParticipants) return NextResponse.json({ error: 'Event is full' }, { status: 409 });

    if (eventData.joinType === 'approval') {
      if (!eventData.pendingRequests.includes(userId)) eventData.pendingRequests.push(userId);
      await db.prepare('INSERT OR IGNORE INTO event_participants (postId, userId, status) VALUES (?, ?, ?)').run(postId, userId, 'pending');
      // Notify the organizer (works even for anonymous events, matched via ownerId).
      if (organizerId && organizerId !== userId) {
        const joiner = await db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
        const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
        await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(nid, organizerId, 'event-join-request', userId, `${joiner?.name || 'Someone'} requested to join ${eventData.name}`, postId, 'post');
      }
    } else {
      eventData.participants.push(userId);
      eventData.currentParticipants = eventData.participants.length;
      await db.prepare('INSERT OR IGNORE INTO event_participants (postId, userId, status) VALUES (?, ?, ?)').run(postId, userId, 'joined');
    }
  } else if (action === 'leave') {
    // The event organizer cannot leave their own event (they must delete the post instead)
    if (organizerId && organizerId === userId) {
      return NextResponse.json({ error: 'The organizer cannot leave. Delete the event instead.' }, { status: 403 });
    }
    eventData.participants = eventData.participants.filter((id: string) => id !== userId);
    eventData.pendingRequests = eventData.pendingRequests.filter((id: string) => id !== userId);
    eventData.currentParticipants = eventData.participants.length;
    await db.prepare('DELETE FROM event_participants WHERE postId = ? AND userId = ?').run(postId, userId);
  } else if (action === 'approve') {
    // Only the organizer can approve a pending request
    const { targetUserId } = body;
    if (!organizerId || organizerId !== userId) return NextResponse.json({ error: 'Only the organizer can approve' }, { status: 403 });
    if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 });
    if (eventData.currentParticipants >= eventData.maxParticipants) return NextResponse.json({ error: 'Event is full' }, { status: 409 });

    eventData.pendingRequests = eventData.pendingRequests.filter((id: string) => id !== targetUserId);
    if (!eventData.participants.includes(targetUserId)) eventData.participants.push(targetUserId);
    eventData.currentParticipants = eventData.participants.length;
    await db.prepare("UPDATE event_participants SET status = 'joined' WHERE postId = ? AND userId = ?").run(postId, targetUserId);

    // Notify the approved user
    const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(nid, targetUserId, 'event-approved', userId, `You're in! Your request to join ${eventData.name} was accepted`, postId, 'post');
  } else if (action === 'reject') {
    // Only the organizer can reject a pending request
    const { targetUserId } = body;
    if (!organizerId || organizerId !== userId) return NextResponse.json({ error: 'Only the organizer can reject' }, { status: 403 });
    if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 });
    eventData.pendingRequests = eventData.pendingRequests.filter((id: string) => id !== targetUserId);
    await db.prepare('DELETE FROM event_participants WHERE postId = ? AND userId = ?').run(postId, targetUserId);
  }

  await db.prepare('UPDATE posts SET eventData = ? WHERE id = ?').run(JSON.stringify(eventData), postId);
  return NextResponse.json({ success: true, eventData });
}
