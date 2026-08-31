import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

// GET /api/messages?userId=u1 — get conversations for user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

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

// POST /api/messages — send a message
export async function POST(request: Request) {
  const body = await request.json();
  const { conversationId, senderId, content } = body;

  if (!conversationId || !senderId || !content) {
    return NextResponse.json({ error: 'conversationId, senderId, content required' }, { status: 400 });
  }

  const db = await getDb();

  // Verify sender is connected for direct messages
  const conv = await db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId) as any;
  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

  if (conv.type === 'direct') {
    const participants = JSON.parse(conv.participants || '[]');
    const otherUser = participants.find((p: string) => p !== senderId);
    if (otherUser) {
      const connected = await db.prepare('SELECT * FROM connections WHERE userId = ? AND connectedUserId = ?').get(senderId, otherUser);
      if (!connected) {
        return NextResponse.json({ error: 'Must be connected to send messages' }, { status: 403 });
      }
    }
  }

  const id = `m_${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = new Date().toISOString();
  await db.prepare('INSERT INTO messages (id, conversationId, senderId, content, read, createdAt) VALUES (?, ?, ?, ?, 0, ?)').run(id, conversationId, senderId, content, createdAt);

  // Notify other participants
  const sender = await db.prepare('SELECT name FROM users WHERE id = ?').get(senderId) as any;
  const parts: string[] = JSON.parse(conv.participants || '[]');
  const convName = conv.name || sender?.name || 'New message';
  for (const uid of parts.filter(p => p !== senderId)) {
    const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
    const nType = conv.type === 'direct' ? 'new-message' : 'group-message';
    const msg = conv.type === 'direct' ? `${sender?.name || 'Someone'} sent you a message` : `${sender?.name || 'Someone'} messaged ${conv.name || 'the group'}`;
    await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, read) VALUES (?, ?, ?, ?, ?, 0)').run(nid, uid, nType, senderId, msg);
  }

  return NextResponse.json({ id, conversationId, senderId, content, read: false, createdAt }, { status: 201 });
}

// PATCH /api/messages — mark all messages in a conversation as read for a user
export async function PATCH(request: Request) {
  const body = await request.json();
  const { conversationId, userId } = body;
  if (!conversationId || !userId) return NextResponse.json({ error: 'conversationId, userId required' }, { status: 400 });
  const db = await getDb();
  await db.prepare('UPDATE messages SET read = 1 WHERE conversationId = ? AND senderId != ?').run(conversationId, userId);
  return NextResponse.json({ success: true });
}
