import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json({
    ...user,
    interests: JSON.parse(user.interests || '[]'),
    hobbies: JSON.parse(user.hobbies || '[]'),
    isOnline: !!user.isOnline,
    wingmanEnabled: !!user.wingmanEnabled,
  });
}

// PATCH /api/users/:id — update user profile
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const db = await getDb();

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
