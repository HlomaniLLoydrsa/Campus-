import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId, getSessionUserId } from '@/lib/auth';

// GET /api/services/:id — service + reviews + (provider) requests + caller state
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const sessionUserId = await getSessionUserId();

  const r = await db.prepare('SELECT * FROM services WHERE id = ?').get(id) as any;
  if (!r) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

  const reviews = await db.prepare('SELECT * FROM service_reviews WHERE serviceId = ? ORDER BY createdAt DESC').all(id) as any[];
  const agg = await db.prepare('SELECT COUNT(*) as c, AVG(rating) as avg FROM service_reviews WHERE serviceId = ?').get(id) as any;
  let saved = false; let myReview: any = null; let myRequest: any = null; let requests: any[] = [];
  if (sessionUserId) {
    saved = !!(await db.prepare('SELECT 1 FROM service_saves WHERE serviceId = ? AND userId = ?').get(id, sessionUserId));
    myReview = await db.prepare('SELECT rating, comment FROM service_reviews WHERE serviceId = ? AND userId = ?').get(id, sessionUserId) || null;
    myRequest = await db.prepare("SELECT * FROM service_requests WHERE serviceId = ? AND requesterId = ? AND status IN ('pending','accepted') ORDER BY createdAt DESC").get(id, sessionUserId) || null;
    if (r.providerId === sessionUserId) requests = await db.prepare('SELECT * FROM service_requests WHERE serviceId = ? ORDER BY createdAt DESC').all(id) as any[];
  }

  return NextResponse.json({
    ...r,
    portfolio: JSON.parse(r.portfolio || '[]'),
    reviews,
    ratingCount: agg?.c || 0,
    ratingAvg: agg?.avg ? Math.round(agg.avg * 10) / 10 : 0,
    saved, myReview, myRequest, requests,
  });
}

// PATCH /api/services/:id — save/unsave, review, request, respondRequest, edit
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const db = await getDb();
  const r = await db.prepare('SELECT * FROM services WHERE id = ?').get(id) as any;
  if (!r) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

  const body = await request.json();
  const { action } = body;

  if (action === 'save') { await db.prepare('INSERT OR IGNORE INTO service_saves (serviceId, userId) VALUES (?, ?)').run(id, userId); return NextResponse.json({ saved: true }); }
  if (action === 'unsave') { await db.prepare('DELETE FROM service_saves WHERE serviceId = ? AND userId = ?').run(id, userId); return NextResponse.json({ saved: false }); }

  if (action === 'review') {
    if (r.providerId === userId) return NextResponse.json({ error: "You can't review your own service" }, { status: 400 });
    const rating = Number(body.rating);
    if (!rating || rating < 1 || rating > 5) return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    await db.prepare('INSERT INTO service_reviews (serviceId, userId, rating, comment) VALUES (?, ?, ?, ?) ON CONFLICT(serviceId, userId) DO UPDATE SET rating = excluded.rating, comment = excluded.comment').run(id, userId, rating, (body.comment || '').trim());
    return NextResponse.json({ success: true });
  }

  // Request a service / tutor session — notifies the provider.
  if (action === 'request') {
    if (r.providerId === userId) return NextResponse.json({ error: 'This is your own listing' }, { status: 400 });
    const reqId = `sr_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO service_requests (id, serviceId, requesterId, providerId, note, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      reqId, id, userId, r.providerId, (body.note || '').trim(), 'pending', new Date().toISOString()
    );
    const requester = await db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
    const label = r.kind === 'tutor' ? 'a tutoring session' : `your service "${r.name}"`;
    const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(
      nid, r.providerId, 'mention', userId, `${requester?.name || 'Someone'} requested ${label} 💼`, id, 'service'
    );
    return NextResponse.json({ success: true, requestId: reqId });
  }

  // Provider responds to a request; also open a chat when accepted.
  if (action === 'respondRequest') {
    if (r.providerId !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    const { requestId, decision } = body; // accepted|declined|completed
    const sr = await db.prepare('SELECT * FROM service_requests WHERE id = ? AND serviceId = ?').get(requestId, id) as any;
    if (!sr) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    const valid = ['accepted', 'declined', 'completed'];
    if (!valid.includes(decision)) return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    await db.prepare('UPDATE service_requests SET status = ? WHERE id = ?').run(decision, requestId);

    let convId: string | undefined;
    if (decision === 'accepted') {
      const all = await db.prepare("SELECT * FROM conversations WHERE type = 'direct'").all() as any[];
      let conv = all.find(c => { const p = JSON.parse(c.participants || '[]'); return p.includes(userId) && p.includes(sr.requesterId); });
      if (conv) convId = conv.id;
      else { convId = `conv_${crypto.randomUUID().slice(0, 8)}`; await db.prepare('INSERT INTO conversations (id, type, participants) VALUES (?, ?, ?)').run(convId, 'direct', JSON.stringify([userId, sr.requesterId])); }
      const mid = `m_${crypto.randomUUID().slice(0, 8)}`;
      await db.prepare('INSERT INTO messages (id, conversationId, senderId, content, read, createdAt) VALUES (?, ?, ?, ?, 0, ?)').run(mid, convId, userId, `💼 I accepted your request for "${r.name}". Let's sort out the details!`, new Date().toISOString());
    }
    const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
    const msg = decision === 'accepted' ? `Your request for "${r.name}" was accepted 🎉` : decision === 'completed' ? `Your "${r.name}" request was marked completed ✅` : `Your request for "${r.name}" was declined`;
    await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(
      nid, sr.requesterId, decision === 'accepted' ? 'new-message' : 'mention', userId, msg, convId || id, convId ? 'conversation' : 'service'
    );
    return NextResponse.json({ success: true, conversationId: convId });
  }

  // Message the provider directly.
  if (action === 'message') {
    if (r.providerId === userId) return NextResponse.json({ error: 'This is your own listing' }, { status: 400 });
    const text = (body.text || `Hi! I'm interested in "${r.name}".`).toString();
    const all = await db.prepare("SELECT * FROM conversations WHERE type = 'direct'").all() as any[];
    let conv = all.find(c => { const p = JSON.parse(c.participants || '[]'); return p.includes(userId) && p.includes(r.providerId); });
    let convId: string;
    if (conv) convId = conv.id;
    else { convId = `conv_${crypto.randomUUID().slice(0, 8)}`; await db.prepare('INSERT INTO conversations (id, type, participants) VALUES (?, ?, ?)').run(convId, 'direct', JSON.stringify([userId, r.providerId])); }
    const mid = `m_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO messages (id, conversationId, senderId, content, read, createdAt) VALUES (?, ?, ?, ?, 0, ?)').run(mid, convId, userId, `💼 About "${r.name}": ${text}`, new Date().toISOString());
    const sender = await db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
    const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(nid, r.providerId, 'new-message', userId, `${sender?.name || 'Someone'} messaged you about "${r.name}"`, convId, 'conversation');
    return NextResponse.json({ success: true, conversationId: convId });
  }

  // Owner-only edit.
  if (action === 'edit') {
    if (r.providerId !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    const name = (body.name ?? r.name).trim() || r.name;
    const description = (body.description ?? (r.description || '')).trim();
    const rate = (body.rate ?? (r.rate || '')).trim();
    const campus = (body.campus ?? (r.campus || '')).trim();
    const availability = (body.availability ?? (r.availability || '')).trim();
    const subjects = (body.subjects ?? (r.subjects || '')).trim();
    const experience = (body.experience ?? (r.experience || '')).trim();
    const portfolio = Array.isArray(body.portfolio) ? body.portfolio.slice(0, 6) : JSON.parse(r.portfolio || '[]');
    await db.prepare('UPDATE services SET name=?, description=?, rate=?, campus=?, availability=?, subjects=?, experience=?, portfolio=? WHERE id=?').run(
      name, description, rate, campus, availability, subjects, experience, JSON.stringify(portfolio), id
    );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// DELETE /api/services/:id — provider deletes their listing.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const db = await getDb();
  const r = await db.prepare('SELECT providerId FROM services WHERE id = ?').get(id) as any;
  if (!r) return NextResponse.json({ success: true });
  if (r.providerId !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  await db.prepare('DELETE FROM services WHERE id = ?').run(id);
  await db.prepare('DELETE FROM service_reviews WHERE serviceId = ?').run(id);
  await db.prepare('DELETE FROM service_saves WHERE serviceId = ?').run(id);
  await db.prepare('DELETE FROM service_requests WHERE serviceId = ?').run(id);
  return NextResponse.json({ success: true });
}
