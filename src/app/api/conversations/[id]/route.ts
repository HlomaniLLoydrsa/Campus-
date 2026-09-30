import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { getGroup, isMember, isAdmin, saveGroupMembership, GROUP_NAME_MAX, GROUP_DESC_MAX } from '@/lib/groups';

// GET /api/conversations/:id — group detail + members (members only).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { id } = await params;

  const group = await getGroup(id);
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  if (!isMember(group, userId)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const db = await getDb();
  const members = [];
  for (const mId of group.participants) {
    const u = await db.prepare('SELECT id, name, username, avatar FROM users WHERE id = ?').get(mId) as any;
    if (u) members.push({ id: u.id, name: u.name, username: u.username, avatar: u.avatar || '', role: group.adminIds.includes(u.id) ? 'admin' : 'member' });
  }

  return NextResponse.json({
    id: group.id,
    name: group.name,
    description: group.description || '',
    image: group.image || '',
    privacy: group.privacy,
    participants: group.participants,
    adminIds: group.adminIds,
    members,
    isAdmin: isAdmin(group, userId),
  });
}

async function notify(db: any, userId: string, fromUserId: string, message: string, relatedId: string) {
  const nid = `n_${crypto.randomUUID().slice(0, 8)}`;
  await db.prepare('INSERT INTO notifications (id, userId, type, fromUserId, message, relatedId, relatedType, read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)')
    .run(nid, userId, 'group-message', fromUserId, message, relatedId, 'conversation');
}
async function actorName(db: any, userId: string): Promise<string> {
  const u = await db.prepare('SELECT name, username FROM users WHERE id = ?').get(userId) as any;
  return u?.name || u?.username || 'Someone';
}

// PATCH /api/conversations/:id — group management.
// action: updateInfo | addMembers | removeMember | promote | demote | leave | join
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body.action;

  const group = await getGroup(id);
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

  const db = await getDb();
  const admin = isAdmin(group, userId);
  const member = isMember(group, userId);

  // ── JOIN (discoverable groups only) — the ONLY action a non-member may take ──
  if (action === 'join') {
    if (member) return NextResponse.json({ success: true, alreadyMember: true });
    if (group.privacy !== 'discoverable') {
      return NextResponse.json({ error: 'This group is private' }, { status: 403 });
    }
    const parts = Array.from(new Set([...group.participants, userId]));
    await saveGroupMembership(id, parts, group.adminIds);
    return NextResponse.json({ success: true });
  }

  // Everything below requires membership at minimum.
  if (!member) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  // ── LEAVE (any member) — safely handle the last admin leaving ──
  if (action === 'leave') {
    let parts = group.participants.filter(p => p !== userId);
    let admins = group.adminIds.filter(a => a !== userId);
    if (parts.length === 0) {
      // Last person leaving → delete the group entirely.
      await db.prepare('DELETE FROM messages WHERE conversationId = ?').run(id);
      await db.prepare("DELETE FROM notifications WHERE relatedType = 'conversation' AND relatedId = ?").run(id);
      await db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
      return NextResponse.json({ success: true, deleted: true });
    }
    // If the leaver was the last admin, promote the oldest remaining member.
    if (admins.length === 0) admins = [parts[0]];
    await saveGroupMembership(id, parts, admins);
    return NextResponse.json({ success: true });
  }

  // ── All remaining actions are ADMIN-ONLY ──
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  if (action === 'updateInfo') {
    const fields: string[] = [];
    const values: any[] = [];
    if (body.name !== undefined) {
      const n = (body.name || '').toString().trim().slice(0, GROUP_NAME_MAX);
      if (!n) return NextResponse.json({ error: 'Group name cannot be empty' }, { status: 400 });
      fields.push('name = ?'); values.push(n);
    }
    if (body.description !== undefined) { fields.push('description = ?'); values.push((body.description || '').toString().trim().slice(0, GROUP_DESC_MAX)); }
    if (body.image !== undefined) { fields.push('image = ?'); values.push((body.image || '').toString() || null); }
    if (body.privacy !== undefined) { fields.push('privacy = ?'); values.push(body.privacy === 'discoverable' ? 'discoverable' : 'private'); }
    if (fields.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    values.push(id);
    await db.prepare(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return NextResponse.json({ success: true });
  }

  if (action === 'addMembers') {
    // Only real friends of the ACTING admin can be added (prevents adding strangers/invalid ids).
    const friendRows = await db.prepare('SELECT connectedUserId FROM connections WHERE userId = ?').all(userId) as any[];
    const friendIds = new Set(friendRows.map(r => r.connectedUserId));
    const requested = Array.isArray(body.userIds) ? body.userIds.filter((x: any) => typeof x === 'string') : [];
    const toAdd = requested.filter((uid: string) => friendIds.has(uid) && !group.participants.includes(uid));
    if (toAdd.length === 0) return NextResponse.json({ error: 'No valid members to add' }, { status: 400 });
    const parts = Array.from(new Set([...group.participants, ...toAdd]));
    await saveGroupMembership(id, parts, group.adminIds);
    const who = await actorName(db, userId);
    for (const uid of toAdd) await notify(db, uid, userId, `${who} added you to "${group.name}"`, id);
    return NextResponse.json({ success: true, added: toAdd });
  }

  if (action === 'removeMember') {
    const target = (body.userId || '').toString();
    if (!target || !group.participants.includes(target)) return NextResponse.json({ error: 'User is not a member' }, { status: 400 });
    if (target === userId) return NextResponse.json({ error: 'Use leave to remove yourself' }, { status: 400 });
    const parts = group.participants.filter(p => p !== target);
    const admins = group.adminIds.filter(a => a !== target);
    await saveGroupMembership(id, parts, admins);
    return NextResponse.json({ success: true });
  }

  if (action === 'promote') {
    const target = (body.userId || '').toString();
    if (!group.participants.includes(target)) return NextResponse.json({ error: 'User is not a member' }, { status: 400 });
    if (!group.adminIds.includes(target)) {
      const admins = [...group.adminIds, target];
      await saveGroupMembership(id, group.participants, admins);
      await notify(db, target, userId, `You are now an admin of "${group.name}"`, id);
    }
    return NextResponse.json({ success: true });
  }

  if (action === 'demote') {
    const target = (body.userId || '').toString();
    if (!group.adminIds.includes(target)) return NextResponse.json({ error: 'User is not an admin' }, { status: 400 });
    // Never allow removing the last admin.
    if (group.adminIds.length <= 1) return NextResponse.json({ error: 'A group must have at least one admin' }, { status: 400 });
    const admins = group.adminIds.filter(a => a !== target);
    await saveGroupMembership(id, group.participants, admins);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

// DELETE /api/conversations/:id — permanently delete the group (admin only).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { id } = await params;

  const group = await getGroup(id);
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  if (!isAdmin(group, userId)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const db = await getDb();
  await db.prepare('DELETE FROM messages WHERE conversationId = ?').run(id);
  await db.prepare("DELETE FROM notifications WHERE relatedType = 'conversation' AND relatedId = ?").run(id);
  await db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
