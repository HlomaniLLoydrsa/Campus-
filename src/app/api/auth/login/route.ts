import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });

  const db = await getDb();

  const hashedPassword = crypto.createHash('sha256').update(password + 'campus_salt').digest('hex');

  const user = await db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email.trim(), hashedPassword) as any;
  if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

  // Update online status
  await db.prepare('UPDATE users SET isOnline = 1 WHERE id = ?').run(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatar: user.avatar || '',
      coverImage: user.coverImage || '',
      bio: user.bio || '',
      course: user.course || '',
      faculty: user.faculty || '',
      yearOfStudy: user.yearOfStudy || 1,
      interests: JSON.parse(user.interests || '[]'),
      hobbies: JSON.parse(user.hobbies || '[]'),
      isOnline: true,
    },
  });
}
