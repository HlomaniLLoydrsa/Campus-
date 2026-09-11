import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';

// GET /api/messages — get conversations for the AUTHENTICATED user (identity from session, not query)
export async function GET() {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const db = await getDb();
  const allConversations = await db.prepare('SELECT * FROM conversations').all() as any[];

  // Filter conversations where user is a participant
  const userConversations = allConversations.filter(c => {
    const participants = JSON.parse(c.participants || '[]');
    return participants.includes(userId);
  });

  // Get messages for each conversation
  const result = [];
  for (const conv of userConversations) {
    const messages = await db.prepare('SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC').all(conv.id) as any[];
    const lastMessage = messages[messages.length - 1] || null;
    const unreadCount = messages.filter(m => !m.read && m.senderId !== userId).length;

    result.push({
      ...conv,
      participants: JSON.parse(conv.participants || '[]'),
      messages: messages.map(m => ({ ...m, read: !!m.read })),
      lastMessage: lastMessage ? { ...lastMessage, read: !!lastMessage.read } : null,
      unreadCount,
    });
  }

  return NextResponse.json(result);
}

// POST /api/messages — send a message AS the authenticated user (senderId is ignored/derived from session)
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const senderId = auth;

  const body = await request.json();
  const { conversationId, content } = body;

  if (!conversationId || !content) {
    return NextResponse.json({ error: 'conversationId and content required' }, { status: 400 });
  }

  const db = await getDb();

  // Sender must be a participant in the conversation.
  const conv = await db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId) as any;
  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  const participants = JSON.parse(conv.participants || '[]');
  if (!participants.includes(senderId)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  // Messaging is allowed to any participant of an EXISTING conversation. Direct conversations
  // between non-friends are only ever created by explicit server-side flows (accepted Lost & Found
  // claim, marketplace/service enquiry, wingman match, or a normal connection), so membership in
  // the conversation is itself the authorization. Creating a NEW direct conversation still requires
  // a connection (enforced in POST /api/conversations). This lets, e.g., a finder and claimant
  // arrange a handover even though they aren't friends.

  const id = `m_${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = new Date().toISOString();
  await db.prepare('INSERT INTO messages (id, conversationId, senderId, content, read, createdAt) VALUES (?, ?, ?, ?, 0, ?)').run(id, conversationId, senderId, content, createdAt);

  // NOTE: messages intentionally do NOT create notifications.
  // Unread messages are surfaced only via the message icon badge (conversation unreadCount).

  return NextResponse.json({ id, conversationId, senderId, content, read: false, createdAt }, { status: 201 });
}

// PATCH /api/messages — mark messages in a conversation as read for the authenticated user
export async function PATCH(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await request.json();
  const { conversationId } = body;
  if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 });

  const db = await getDb();
  // Only a participant may mark a conversation read.
  const conv = await db.prepare('SELECT participants FROM conversations WHERE id = ?').get(conversationId) as any;
  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  if (!JSON.parse(conv.participants || '[]').includes(userId)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  await db.prepare('UPDATE messages SET read = 1 WHERE conversationId = ? AND senderId != ?').run(conversationId, userId);
  return NextResponse.json({ success: true });
}
