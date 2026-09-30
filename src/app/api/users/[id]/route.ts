import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { deleteUserCascade } from '@/lib/admin';

// Never expose the password hash. Email is only returned to the account owner.
const PUBLIC_COLUMNS =
  'id, name, username, avatar, coverImage, bio, course, faculty, yearOfStudy, age, gender, university, onboarded, interests, hobbies, isOnline, lastSeen, wingmanEnabled, privacySettings, createdAt';

const DEFAULT_PRIVACY = { showProfile: 'everyone', showInterests: 'everyone', allowRequests: 'everyone', allowMessages: 'connections-only', showOnlineStatus: true, showRelationship: false };

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
    onboarded: !!user.onboarded,
    privacySettings: user.privacySettings ? { ...DEFAULT_PRIVACY, ...safeParse(user.privacySettings) } : DEFAULT_PRIVACY,
  });
}

function safeParse(s: string) { try { return JSON.parse(s) || {}; } catch { return {}; } }

// PATCH /api/users/:id — update user profile (owner only)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const db = await getDb();

  // Must be logged in AND editing your own profile.
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId || sessionUserId !== id) {
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
  const allowedFields = ['name', 'username', 'avatar', 'coverImage', 'bio', 'course', 'faculty', 'yearOfStudy', 'age', 'gender', 'university', 'onboarded', 'interests', 'hobbies', 'wingmanEnabled', 'privacySettings'];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === 'interests' || field === 'hobbies' || field === 'privacySettings') {
        fields.push(`${field} = ?`);
        values.push(JSON.stringify(body[field]));
      } else if (field === 'wingmanEnabled' || field === 'onboarded') {
        fields.push(`${field} = ?`);
        values.push(body[field] ? 1 : 0);
      } else if (field === 'age') {
        // Store a sane integer age, or null to clear it.
        const n = parseInt(body.age, 10);
        fields.push('age = ?');
        values.push(Number.isFinite(n) && n > 0 && n < 120 ? n : null);
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

  const updated = await db.prepare(`SELECT ${PUBLIC_COLUMNS}, email FROM users WHERE id = ?`).get(id) as any;
  return NextResponse.json({
    ...updated,
    interests: JSON.parse(updated.interests || '[]'),
    hobbies: JSON.parse(updated.hobbies || '[]'),
    isOnline: !!updated.isOnline,
    wingmanEnabled: !!updated.wingmanEnabled,
    onboarded: !!updated.onboarded,
    privacySettings: updated.privacySettings ? { ...DEFAULT_PRIVACY, ...safeParse(updated.privacySettings) } : DEFAULT_PRIVACY,
  });
}

// DELETE /api/users/:id — permanently delete the account and associated data (owner only)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();

  // Deleting an account is destructive — require a verified session matching the target.
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId || sessionUserId !== id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(id) as any;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Use the canonical cascade (same as admin delete) so anonymous posts (matched
  // via ownerId), their comments/reactions/reports, and every feature-table row
  // (marketplace, services, academy, lost-found, secret-admirers, blocks, etc.)
  // are removed too — no orphans left behind.
  await deleteUserCascade(id);

  return NextResponse.json({ success: true });
}
