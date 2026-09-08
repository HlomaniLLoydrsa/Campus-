import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, isLegacyHash, hashPassword, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });

  const db = await getDb();

  // Look up by email, then verify the password against the stored hash (scrypt or legacy).
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim()) as any;
  if (!user || !verifyPassword(password, user.password || '')) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  // Transparently upgrade old sha256 hashes to scrypt on successful login.
  if (isLegacyHash(user.password || '')) {
    try { await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(password), user.id); } catch { /* non-fatal */ }
  }

  // Update online status + establish a verified server session
  await db.prepare('UPDATE users SET isOnline = 1 WHERE id = ?').run(user.id);
  await setSessionCookie(user.id);

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
