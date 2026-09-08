import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

// Never expose the password hash. Email is only returned to the account owner.
const PUBLIC_COLUMNS =
  'id, name, username, avatar, coverImage, bio, course, faculty, yearOfStudy, interests, hobbies, isOnline, lastSeen, wingmanEnabled, createdAt';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const sessionUserId = await getSessionUserId();
  // Owner may also see their own email; others get public columns only.
  const columns = sessionUserId === id ? `${PUBLIC_COLUMNS}, email` : PUBLIC_COLUMNS;
  const user = await db.prepare(`SELECT ${columns} FROM users WHERE id = ?`).get(id) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json({
    ...user,
    interests: JSON.parse(user.interests || '[]'),
    hobbies: JSON.parse(user.hobbies || '[]'),
    isOnline: !!user.isOnline,
    wingmanEnabled: !!user.wingmanEnabled,
  });
}

// PATCH /api/users/:id — update user profile (owner only)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const db = await getDb();

  // If a verified session exists it MUST match the target user (blocks editing others' profiles).
  const sessionUserId = await getSessionUserId();
  if (sessionUserId && sessionUserId !== id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
  }
  if (body.username !== undefined && !body.username.trim()) {
    return NextResponse.json({ error: 'Username cannot be empty' }, { status: 400 });
  }
  if (body.username !== undefined) {
    const existing = await db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(body.username, id);
    if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  const fields: string[] = [];
  const values: any[] = [];
  const allowedFields = ['name', 'username', 'avatar', 'coverImage', 'bio', 'course', 'faculty', 'yearOfStudy', 'interests', 'hobbies', 'wingmanEnabled'];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === 'interests' || field === 'hobbies') {
        fields.push(`${field} = ?`);
        values.push(JSON.stringify(body[field]));
      } else if (field === 'wingmanEnabled') {
        fields.push(`${field} = ?`);
        values.push(body[field] ? 1 : 0);
      } else {
        fields.push(`${field} = ?`);
        values.push(body[field]);
      }
    }
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  values.push(id);
  await db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const updated = await db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  return NextResponse.json({
    ...updated,
    interests: JSON.parse(updated.interests || '[]'),
    hobbies: JSON.parse(updated.hobbies || '[]'),
    isOnline: !!updated.isOnline,
    wingmanEnabled: !!updated.wingmanEnabled,
  });
}

// DELETE /api/users/:id — permanently delete the account and associated data (owner only)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();

  // Deleting an account is destructive — require a verified session matching the target.
  const sessionUserId = await getSessionUserId();
  if (sessionUserId && sessionUserId !== id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(id) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Remove the user's data across tables (best-effort; ignore tables that may not have rows)
  await db.prepare('DELETE FROM users WHERE id = ?').run(id);
  await db.prepare('DELETE FROM posts WHERE authorId = ?').run(id);
  await db.prepare('DELETE FROM comments WHERE authorId = ?').run(id);
  await db.prepare('DELETE FROM notifications WHERE userId = ? OR fromUserId = ?').run(id, id);
  await db.prepare('DELETE FROM connections WHERE userId = ? OR connectedUserId = ?').run(id, id);
  await db.prepare('DELETE FROM connection_requests WHERE fromUserId = ? OR toUserId = ?').run(id, id);
  await db.prepare('DELETE FROM messages WHERE senderId = ?').run(id);
  await db.prepare('DELETE FROM stories WHERE userId = ?').run(id);

  return NextResponse.json({ success: true });
}
