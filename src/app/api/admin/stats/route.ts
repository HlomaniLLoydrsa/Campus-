import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

// GET /api/admin/stats — high-level counts for the admin dashboard.
export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const db = await getDb();
  const count = async (sql: string): Promise<number> => {
    try { const r = await db.prepare(sql).get() as any; return Number(r?.n || 0); } catch { return 0; }
  };

  const [totalUsers, suspendedUsers, totalPosts, pendingReports, totalReports] = await Promise.all([
    count('SELECT COUNT(*) AS n FROM users'),
    count("SELECT COUNT(*) AS n FROM users WHERE status = 'suspended'"),
    count('SELECT COUNT(*) AS n FROM posts'),
    count("SELECT COUNT(*) AS n FROM reports WHERE status = 'pending'"),
    count('SELECT COUNT(*) AS n FROM reports'),
  ]);

  return NextResponse.json({ totalUsers, suspendedUsers, totalPosts, pendingReports, totalReports });
}
