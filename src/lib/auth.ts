import crypto from 'crypto';
import { cookies } from 'next/headers';

/**
 * Auth utilities: password hashing + a signed session cookie.
 *
 * Session model: after login/signup we set an HTTP-only, signed cookie containing the
 * user id. Server routes can call getSessionUserId() to get a *verified* identity that
 * the client cannot forge, instead of trusting a userId passed in the query/body.
 *
 * Password hashing: new passwords use scrypt with a per-user random salt.
 * Legacy passwords used unsalted SHA-256 (`sha256(password + 'campus_salt')`);
 * verifyPassword() still accepts those so existing accounts keep working, and callers
 * can transparently upgrade the stored hash on next successful login.
 */

const SESSION_COOKIE = 'vybe_session';
const LEGACY_SALT = 'campus_salt';

function getSecret(): string {
  return process.env.AUTH_SECRET || 'dev-only-insecure-secret-change-me';
}

// ── Password hashing ──────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function legacyHash(password: string): string {
  return crypto.createHash('sha256').update(password + LEGACY_SALT).digest('hex');
}

/** Returns true if the password matches the stored hash (supports scrypt + legacy sha256). */
export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  if (stored.startsWith('scrypt$')) {
    const [, salt, hash] = stored.split('$');
    if (!salt || !hash) return false;
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    // constant-time compare
    const a = Buffer.from(derived, 'hex');
    const b = Buffer.from(hash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  // Legacy plain sha256 hash
  return legacyHash(password) === stored;
}

/** True when a stored hash is in the old format and should be re-hashed on next login. */
export function isLegacyHash(stored: string): boolean {
  return !!stored && !stored.startsWith('scrypt$');
}

// ── Signed session cookie ─────────────────────────────────────────

function sign(value: string): string {
  const sig = crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
  return `${value}.${sig}`;
}

function verify(signed: string | undefined): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf('.');
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return value;
}

/** Set the signed session cookie for a user (call from login/signup routes). */
export async function setSessionCookie(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, sign(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/** Clear the session cookie (call from logout route). */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Returns the verified user id from the session cookie, or null.
 * Routes should prefer this over any client-supplied userId.
 */
export async function getSessionUserId(): Promise<string | null> {
  try {
    const store = await cookies();
    const raw = store.get(SESSION_COOKIE)?.value;
    return verify(raw);
  } catch {
    return null;
  }
}
