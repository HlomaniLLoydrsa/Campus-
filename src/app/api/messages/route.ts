import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId } from '@/lib/auth';
import { isBlockedBetween } from '@/lib/blocks';

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
    const rows = await db.prepare('SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC').all(conv.id) as any[];
    // Index by id so replies can resolve a small preview of the message they reply to.
    const byId: Record<string, any> = {};
    for (const r of rows) byId[r.id] = r;

    const messages = rows.map(m => {
      let reactions: Record<string, string[]> = {};
      try { reactions = m.reactions ? JSON.parse(m.reactions) : {}; } catch { reactions = {}; }
      let replyTo: { id: string; senderId: string; content: string } | undefined;
      if (m.replyToId && byId[m.replyToId]) {
        const p = byId[m.replyToId];
        replyTo = { id: p.id, senderId: p.senderId, content: (p.content || '').slice(0, 120) };
      }
      return { ...m, read: !!m.read, reactions, replyTo };
    });
    const lastMessage = messages[messages.length - 1] || null;
    const unreadCount = rows.filter(m => !m.read && m.senderId !== userId).length;

    result.push({
      ...conv,
      participants: JSON.parse(conv.participants || '[]'),
      adminIds: JSON.parse(conv.adminIds || '[]'),
      image: conv.image || undefined,
      description: conv.description || undefined,
      privacy: conv.privacy || 'private',
      messages,
      lastMessage: lastMessage ? { ...lastMessage } : null,
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
  const { conversationId, content, replyToId } = body;

  // Optional attachment (image or voice note). Validated lightly here — the file
  // itself was already uploaded via /api/upload, which enforces type/size.
  const attachmentType = body.attachmentType === 'image' || body.attachmentType === 'audio' ? body.attachmentType : null;
  const attachmentUrl = attachmentType && typeof body.attachmentUrl === 'string' ? body.attachmentUrl : null;
  const attachmentDuration = attachmentType === 'audio' && Number.isFinite(body.attachmentDuration)
    ? Math.max(0, Math.round(body.attachmentDuration))
    : null;
  const safeContent = typeof content === 'string' ? content : '';

  // A message must have text OR an attachment.
  if (!conversationId || (!safeContent.trim() && !attachmentUrl)) {
    return NextResponse.json({ error: 'conversationId and content or attachment required' }, { status: 400 });
  }

  const db = await getDb();

  // Sender must be a participant in the conversation.
  const conv = await db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId) as any;
  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  const participants = JSON.parse(conv.participants || '[]');
  if (!participants.includes(senderId)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  // In a DIRECT chat, a block (either direction) stops messages. Group chats are
  // left intact — a block shouldn't silently break a whole group's history.
  if (conv.type === 'direct') {
    const other = participants.find((p: string) => p !== senderId);
    if (other && await isBlockedBetween(senderId, other)) {
      return NextResponse.json({ error: 'You cannot message this user.' }, { status: 403 });
    }
  }

  // If replying, the referenced message must exist in THIS conversation (else drop it).
  let validReplyTo: string | null = null;
  if (replyToId) {
    const parent = await db.prepare('SELECT id, conversationId FROM messages WHERE id = ?').get(replyToId) as any;
    if (parent && parent.conversationId === conversationId) validReplyTo = parent.id;
  }

  // Messaging is allowed to any participant of an EXISTING conversation. Direct conversations
  // between non-friends are only ever created by explicit server-side flows (accepted Lost & Found
  // claim, marketplace/service enquiry, wingman match, or a normal connection), so membership in
  // the conversation is itself the authorization. Creating a NEW direct conversation still requires
  // a connection (enforced in POST /api/conversations). This lets, e.g., a finder and claimant
  // arrange a handover even though they aren't friends.

  const id = `m_${crypto.randomUUID().slice(0, 8)}`;
  const createdAt = new Date().toISOString();
  await db.prepare('INSERT INTO messages (id, conversationId, senderId, content, read, replyToId, attachmentType, attachmentUrl, attachmentDuration, createdAt) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?)').run(
    id, conversationId, senderId, safeContent, validReplyTo, attachmentType, attachmentUrl, attachmentDuration, createdAt
  );

  // Messages (direct AND group) intentionally do NOT create notifications.
  // Unread messages are surfaced only via the message icon badge (conversation
  // unreadCount). Group *membership* events (added to a group, made an admin) DO
  // create notifications — those live in the conversations routes, not here.

  return NextResponse.json({ id, conversationId, senderId, content: safeContent, read: false, replyToId: validReplyTo, attachmentType, attachmentUrl, attachmentDuration, createdAt }, { status: 201 });
}

// PATCH /api/messages
// action 'react' → toggle an emoji reaction on a message (member-gated)
// otherwise (default) → mark a conversation's messages read for the authenticated user
export async function PATCH(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await request.json();
  const db = await getDb();

  // ── Toggle an emoji reaction on a single message ──
  if (body.action === 'react') {
    const { messageId, emoji } = body;
    if (!messageId || !emoji || typeof emoji !== 'string' || emoji.length > 8) {
      return NextResponse.json({ error: 'messageId and emoji required' }, { status: 400 });
    }
    const msg = await db.prepare('SELECT id, conversationId, reactions FROM messages WHERE id = ?').get(messageId) as any;
    if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    // Reactor must be a participant of the message's conversation.
    const c = await db.prepare('SELECT participants FROM conversations WHERE id = ?').get(msg.conversationId) as any;
    if (!c || !JSON.parse(c.participants || '[]').includes(userId)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    let reactions: Record<string, string[]> = {};
    try { reactions = msg.reactions ? JSON.parse(msg.reactions) : {}; } catch { reactions = {}; }
    const current = new Set(reactions[emoji] || []);
    if (current.has(userId)) current.delete(userId); else current.add(userId);
    if (current.size === 0) delete reactions[emoji]; else reactions[emoji] = Array.from(current);
    await db.prepare('UPDATE messages SET reactions = ? WHERE id = ?').run(JSON.stringify(reactions), messageId);
    return NextResponse.json({ success: true, reactions });
  }

  // ── Mark a conversation's messages as read ──
  const { conversationId } = body;
  if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 });

  // Only a participant may mark a conversation read.
  const conv = await db.prepare('SELECT participants FROM conversations WHERE id = ?').get(conversationId) as any;
  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  if (!JSON.parse(conv.participants || '[]').includes(userId)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  await db.prepare('UPDATE messages SET read = 1 WHERE conversationId = ? AND senderId != ?').run(conversationId, userId);
  return NextResponse.json({ success: true });
}
