import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

// POST /api/events — join or leave an event
export async function POST(request: Request) {
  const body = await request.json();
  const { postId, userId, action } = body; // action: join | leave
  if (!postId || !userId || !action) return NextResponse.json({ error: 'postId, userId, action required' }, { status: 400 });

  const db = await getDb();
  const post = await db.prepare('SELECT * FROM posts WHERE id = ?').get(postId) as any;
  if (!post || !post.eventData) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const eventData = JSON.parse(post.eventData);

  if (action === 'join') {
    if (eventData.participants.includes(userId)) return NextResponse.json({ error: 'Already joined' }, { status: 409 });
    if (eventData.currentParticipants >= eventData.maxParticipants) return NextResponse.json({ error: 'Event is full' }, { status: 409 });

    if (eventData.joinType === 'approval') {
      if (!eventData.pendingRequests.includes(userId)) eventData.pendingRequests.push(userId);
      await db.prepare('INSERT OR IGNORE INTO event_participants (postId, userId, status) VALUES (?, ?, ?)').run(postId, userId, 'pending');
      // Notify creator
      if (post.authorId) {
        const joiner = await db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
        const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
        await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, read) VALUES (?, ?, ?, ?, ?, 0)').run(nid, post.authorId, 'event-join-request', userId, `${joiner?.name || 'Someone'} requested to join ${eventData.name}`);
      }
    } else {
      eventData.participants.push(userId);
      eventData.currentParticipants = eventData.participants.length;
      await db.prepare('INSERT OR IGNORE INTO event_participants (postId, userId, status) VALUES (?, ?, ?)').run(postId, userId, 'joined');
    }
  } else if (action === 'leave') {
    eventData.participants = eventData.participants.filter((id: string) => id !== userId);
    eventData.pendingRequests = eventData.pendingRequests.filter((id: string) => id !== userId);
    eventData.currentParticipants = eventData.participants.length;
    await db.prepare('DELETE FROM event_participants WHERE postId = ? AND userId = ?').run(postId, userId);
  }

  await db.prepare('UPDATE posts SET eventData = ? WHERE id = ?').run(JSON.stringify(eventData), postId);
  return NextResponse.json({ success: true, eventData });
}
