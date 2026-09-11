import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

// GET /api/services/requests?role=sent|received — the authenticated user's service requests.
export async function GET(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role') || 'sent';
  const db = await getDb();

  const col = role === 'received' ? 'providerId' : 'requesterId';
  const reqs = await db.prepare(`SELECT * FROM service_requests WHERE ${col} = ? ORDER BY createdAt DESC`).all(userId) as any[];

  // Attach the service name for display.
  const out = [];
  for (const r of reqs) {
    const svc = await db.prepare('SELECT name, kind FROM services WHERE id = ?').get(r.serviceId) as any;
    out.push({ ...r, serviceName: svc?.name || 'Service', serviceKind: svc?.kind || 'service' });
  }
  return NextResponse.json(out);
}
