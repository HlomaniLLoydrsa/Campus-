import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { requireUserId, getSessionUserId } from '@/lib/auth';

function toPublic(r: any, sessionUserId: string | null) {
  return {
    id: r.id, reporterId: r.reporterId, kind: r.kind, itemName: r.itemName,
    category: r.category, description: r.description, photo: r.photo,
    location: r.location, campus: r.campus, dateOn: r.dateOn, status: r.status, createdAt: r.createdAt,
  };
}

// GET /api/lost-found/:id — item detail + possible matches (opposite kind, same category).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const sessionUserId = await getSessionUserId();

  const r = await db.prepare('SELECT * FROM lost_found WHERE id = ?').get(id) as any;
  if (!r) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  const opposite = r.kind === 'lost' ? 'found' : 'lost';
  const candidates = await db.prepare("SELECT * FROM lost_found WHERE kind = ? AND category = ? AND status = 'open'").all(opposite, r.category) as any[];
  const words = `${r.itemName} ${r.location}`.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const matches = candidates
    .filter(c => { const hay = `${c.itemName} ${c.location} ${c.description}`.toLowerCase(); return words.some(w => hay.includes(w)); })
    .map(c => toPublic(c, sessionUserId));

  // Owner sees claims on their item.
  let claims: any[] = [];
  if (sessionUserId && r.reporterId === sessionUserId) {
    claims = await db.prepare('SELECT * FROM lost_found_claims WHERE itemId = ? ORDER BY createdAt DESC').all(id) as any[];
  }

  return NextResponse.json({ ...toPublic(r, sessionUserId), matches, claims });
}

// PATCH /api/lost-found/:id — actions: recover (owner), claim (someone else), resolveClaim (owner)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const db = await getDb();
  const r = await db.prepare('SELECT * FROM lost_found WHERE id = ?').get(id) as any;
  if (!r) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  const body = await request.json();
  const { action } = body;

  if (action === 'recover') {
    if (r.reporterId !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    await db.prepare("UPDATE lost_found SET status = 'recovered' WHERE id = ?").run(id);
    return NextResponse.json({ success: true, status: 'recovered' });
  }

  // Someone claims the item is theirs — they PROVE ownership by describing proof.
  // The finder/reporter reviews the proof and accepts or rejects. (Stored in the
  // existing `answer` column, now used for the claimant's proof text.)
  if (action === 'claim') {
    if (r.reporterId === userId) return NextResponse.json({ error: 'You reported this item' }, { status: 400 });
    const proof = (body.proof ?? body.answer ?? '').toString().trim();
    if (!proof) return NextResponse.json({ error: 'Please describe proof that the item is yours' }, { status: 400 });
    const claimId = `lfc_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO lost_found_claims (id, itemId, claimantId, answer, status) VALUES (?, ?, ?, ?, ?)').run(claimId, id, userId, proof, 'pending');
    // Notify the reporter (finder) that someone has claimed the item + submitted proof to review.
    const claimant = await db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
    const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
    await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(
      nid, r.reporterId, 'mention', userId, `${claimant?.name || 'Someone'} submitted proof to claim "${r.itemName}" — review it 🔎`, id, 'lostfound'
    );
    return NextResponse.json({ success: true });
  }

  // Owner approves/rejects a claim; on approve, open a chat + mark recovered.
  if (action === 'resolveClaim') {
    if (r.reporterId !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    const { claimId, decision } = body; // 'approved' | 'rejected'
    const claim = await db.prepare('SELECT * FROM lost_found_claims WHERE id = ? AND itemId = ?').get(claimId, id) as any;
    if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    await db.prepare('UPDATE lost_found_claims SET status = ? WHERE id = ?').run(decision === 'approved' ? 'approved' : 'rejected', claimId);

    if (decision === 'approved') {
      await db.prepare("UPDATE lost_found SET status = 'recovered' WHERE id = ?").run(id);
      // Connect the two via a message so they can arrange return.
      const all = await db.prepare("SELECT * FROM conversations WHERE type = 'direct'").all() as any[];
      let conv = all.find(c => { const p = JSON.parse(c.participants || '[]'); return p.includes(userId) && p.includes(claim.claimantId); });
      let convId: string;
      if (conv) convId = conv.id;
      else { convId = `conv_${crypto.randomUUID().slice(0, 8)}`; await db.prepare('INSERT INTO conversations (id, type, participants) VALUES (?, ?, ?)').run(convId, 'direct', JSON.stringify([userId, claim.claimantId])); }
      const mid = `m_${crypto.randomUUID().slice(0, 8)}`;
      await db.prepare('INSERT INTO messages (id, conversationId, senderId, content, read, createdAt) VALUES (?, ?, ?, ?, 0, ?)').run(mid, convId, userId, `🔎 Your claim for "${r.itemName}" was approved. Let's arrange the return!`, new Date().toISOString());
      const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
      await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(nid, claim.claimantId, 'new-message', userId, `Your claim for "${r.itemName}" was approved 🎉`, convId, 'conversation');
      return NextResponse.json({ success: true, conversationId: convId });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// DELETE /api/lost-found/:id — reporter removes their own report.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const db = await getDb();
  const r = await db.prepare('SELECT reporterId FROM lost_found WHERE id = ?').get(id) as any;
  if (!r) return NextResponse.json({ success: true });
  if (r.reporterId !== userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  await db.prepare('DELETE FROM lost_found WHERE id = ?').run(id);
  await db.prepare('DELETE FROM lost_found_claims WHERE itemId = ?').run(id);
  return NextResponse.json({ success: true });
}
