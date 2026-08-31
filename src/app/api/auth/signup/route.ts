import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: Request) {
  const body = await request.json();
  const { name, username, email, password, course, faculty, yearOfStudy } = body;

  // Validation
  if (!name || !name.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!username || !username.trim()) return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  if (!email || !email.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  if (!password || password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });

  // Validate username (alphanumeric + underscore only)
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores' }, { status: 400 });

  const db = await getDb();

  // Check username uniqueness
  const existingUsername = await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUsername) return NextResponse.json({ error: 'Username already taken' }, { status: 409 });

  // Check email uniqueness
  const existingEmail = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingEmail) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

  // Hash password (simple hash for demo — in production use bcrypt)
  const hashedPassword = crypto.createHash('sha256').update(password + 'campus_salt').digest('hex');

  // Create user
  const id = `u_${crypto.randomUUID().slice(0, 8)}`;
  await db.prepare(
    'INSERT INTO users (id, name, username, email, password, course, faculty, yearOfStudy, isOnline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)'
  ).run(id, name.trim(), username.trim(), email.trim(), hashedPassword, course || '', faculty || '', yearOfStudy || 1);

  return NextResponse.json({
    user: { id, name: name.trim(), username: username.trim(), email: email.trim(), course, faculty, yearOfStudy },
  }, { status: 201 });
}
