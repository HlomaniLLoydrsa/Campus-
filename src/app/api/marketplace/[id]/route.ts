import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId, getSessionUserId } from '@/lib/auth';

// GET /api/marketplace/:id
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const sessionUserId = await getSessionUserId();
  const r = await db.prepare('SELECT * FROM marketplace_listings WHERE id = ?').get(id) as any;
  if (!r) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  let saved = false;
  if (sessionUserId) saved = !!(await db.prepare('SELECT 1 FROM marketplace_saves WHERE listingId = ? AND userId = ?').get(id, sessionUserId));
  return NextResponse.json({ ...r, images: JSON.parse(r.images || '[]'), saved });
}

// PATCH /api/marketplace/:id — edit (owner), mark sold (owner), save/unsave, message seller
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const db = await getDb();
  const r = await db.prepare('SELECT * FROM marketplace_listings WHERE id = ?').get(id) as any;
  if (!r) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  const body = await request.json();
  const { action } = body;

  if (action === 'save') { await db.prepare('INSERT OR IGNORE INTO marketplace_saves (listingId, userId) VALUES (?, ?)').run(id, userId); return NextResponse.json({ saved: true }); }
  if (action === 'unsave') { await db.prepare('DELETE FROM marketplace_saves WHERE listingId = ? AND userId = ?').run(id, userId); return NextResponse.json({ saved: false }); }

  // Message the seller — opens a direct chat with a listing reference.
  if (action === 'message') {
    if (r.sellerId === userId) return NextResponse.json({ error: 'This is your own listing' }, { status: 400 });
    const text = (body.text || `Hi! Is "${r.title}" still available?`).toString();
    const all = await db.prepare("SELECT * FROM conversations WHERE type = 'direct'").all() as any[];
    let conv = all.find(c => { const p = JSON.parse(c.participants || '[]'); return p.includes(userId) && p.includes(r.sellerId); });
    let convId: string;
    if (conv) convId = conv.id;
    else { convId = `conv_${crypto.randomUUID().slice(0, 8)}`; await db.prepare('INSERT INTO conversations (id, type, participants) VALUES (?, ?, ?)').run(convId, 'direct', JSON.stringify([userId, r.sellerId])); }
    const mid = `m_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO messages (id, conversationId, senderId, content, read, createdAt) VALUES (?, ?, ?, ?, 0, ?)').run(mid, convId, userId, `🛒 About your listing "${r.title}": ${text}`, new Date().toISOString());
    const buyer = await db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
    const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(nid, r.sellerId, 'new-message', userId, `${buyer?.name || 'Someone'} messaged you about "${r.title}"`, convId, 'conversation');
    return NextResponse.json({ success: true, conversationId: convId });
  }

  // Remaining actions are owner-only.
  if (r.sellerId !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  if (action === 'markSold') { await db.prepare("UPDATE marketplace_listings SET status = 'sold' WHERE id = ?").run(id); return NextResponse.json({ status: 'sold' }); }
  if (action === 'relist') { await db.prepare("UPDATE marketplace_listings SET status = 'available' WHERE id = ?").run(id); return NextResponse.json({ status: 'available' }); }

  if (action === 'edit') {
    const { title, description, price, category, condition, images, campus } = body;
    const newTitle = (title ?? r.title).trim() || r.title;
    const newDesc = (description ?? (r.description || '')).trim();
    const newCampus = (campus ?? (r.campus || '')).trim();
    const newImages = Array.isArray(images) ? images.slice(0, 6) : JSON.parse(r.images || '[]');
    await db.prepare(
      `UPDATE marketplace_listings SET title = ?, description = ?, price = ?, category = ?, condition = ?, images = ?, campus = ? WHERE id = ?`
    ).run(
      newTitle, newDesc, Number(price ?? r.price) || 0,
      category ?? r.category, condition ?? r.condition,
      JSON.stringify(newImages), newCampus, id
    );
    const updated = await db.prepare('SELECT * FROM marketplace_listings WHERE id = ?').get(id) as any;
    return NextResponse.json({ ...updated, images: JSON.parse(updated.images || '[]') });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// DELETE /api/marketplace/:id — owner deletes their listing.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const db = await getDb();
  const r = await db.prepare('SELECT sellerId FROM marketplace_listings WHERE id = ?').get(id) as any;
  if (!r) return NextResponse.json({ success: true });
  if (r.sellerId !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  await db.prepare('DELETE FROM marketplace_listings WHERE id = ?').run(id);
  await db.prepare('DELETE FROM marketplace_saves WHERE listingId = ?').run(id);
  return NextResponse.json({ success: true });
}
