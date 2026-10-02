import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { askAssistant, isAssistantAiEnabled, AssistantContext, ChatTurn } from '@/lib/assistant';

// GET /api/assistant — lightweight status (is real AI available?).
export async function GET() {
  return NextResponse.json({ aiEnabled: isAssistantAiEnabled() });
}

// POST /api/assistant — ask the assistant a question.
// Body: { message: string, history?: { role: 'user'|'assistant', content: string }[] }
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  // A message or an image is required (image-only sends are valid).
  const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : undefined;
  const imageMimeType = typeof body.imageMimeType === 'string' ? body.imageMimeType : undefined;
  if (!message && !imageBase64) return NextResponse.json({ error: 'message or image required' }, { status: 400 });
  if (message.length > 1000) return NextResponse.json({ error: 'message too long' }, { status: 400 });
  // Base64 cap ~5.5MB string (≈ 4MB decoded image).
  if (imageBase64 && imageBase64.length > 5_500_000) return NextResponse.json({ error: 'image too large' }, { status: 400 });

  const history: ChatTurn[] = Array.isArray(body.history)
    ? body.history
        .filter((t: any) => t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string')
        .slice(-8)
        .map((t: any) => ({ role: t.role, content: String(t.content).slice(0, 1000) }))
    : [];

  const db = await getDb();

  // ── Gather the user's own app context (grounds the assistant) ──
  const user = await db.prepare('SELECT name, course, university FROM users WHERE id = ?').get(userId) as any;

  // Unread messages: messages in the user's conversations, from others, not read.
  const convs = await db.prepare("SELECT id, participants FROM conversations").all() as any[];
  const myConvIds = convs
    .filter(c => { try { return JSON.parse(c.participants || '[]').includes(userId); } catch { return false; } })
    .map(c => c.id);
  let unreadMessages = 0;
  if (myConvIds.length > 0) {
    const placeholders = myConvIds.map(() => '?').join(',');
    const row = await db
      .prepare(`SELECT COUNT(*) as c FROM messages WHERE conversationId IN (${placeholders}) AND senderId != ? AND read = 0`)
      .get(...myConvIds, userId) as any;
    unreadMessages = row?.c || 0;
  }

  const pendingRow = await db
    .prepare("SELECT COUNT(*) as c FROM connection_requests WHERE toUserId = ? AND status = 'pending'")
    .get(userId) as any;
  const pendingRequests = pendingRow?.c || 0;

  const notifRow = await db
    .prepare('SELECT COUNT(*) as c FROM notifications WHERE userId = ? AND read = 0')
    .get(userId) as any;
  const unreadNotifications = notifRow?.c || 0;

  // Upcoming events the user organizes or has joined.
  const eventPosts = await db.prepare("SELECT eventData FROM posts WHERE eventData IS NOT NULL").all() as any[];
  const upcomingEvents: { name: string; when?: string }[] = [];
  for (const p of eventPosts) {
    try {
      const e = JSON.parse(p.eventData);
      const participants: string[] = Array.isArray(e.participants) ? e.participants : [];
      if (participants.includes(userId)) {
        upcomingEvents.push({ name: e.name || 'Untitled event', when: e.date || undefined });
      }
    } catch { /* skip malformed */ }
  }

  const ctx: AssistantContext = {
    name: user?.name || 'a student',
    course: user?.course || undefined,
    university: user?.university || undefined,
    unreadMessages,
    pendingRequests,
    unreadNotifications,
    upcomingEvents: upcomingEvents.slice(0, 5),
  };

  const result = await askAssistant(ctx, history, message, imageBase64, imageMimeType);
  return NextResponse.json(result);
}
