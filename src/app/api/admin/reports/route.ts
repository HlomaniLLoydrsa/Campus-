import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin, deletePostCascade } from '@/lib/admin';
import { reportReasonLabel } from '@/lib/reports';

// Map a report targetType to (table, columns) so we can show what was reported.
const TARGET_TABLES: Record<string, { table: string; preview: string }> = {
  post: { table: 'posts', preview: 'content' },
  service: { table: 'services', preview: 'name' },
  marketplace: { table: 'marketplace_listings', preview: 'title' },
  lostfound: { table: 'lost_found', preview: 'itemName' },
  academy: { table: 'academy_resources', preview: 'title' },
};

// GET /api/admin/reports?status=pending — moderation queue with resolved targets.
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending';

  const db = await getDb();
  const rows = (status === 'all'
    ? await db.prepare('SELECT * FROM reports ORDER BY createdAt DESC LIMIT 200').all()
    : await db.prepare('SELECT * FROM reports WHERE status = ? ORDER BY createdAt DESC LIMIT 200').all(status)
  ) as any[];

  const out = [];
  for (const r of rows) {
    // Reporter name
    const reporter = await db.prepare('SELECT name, username FROM users WHERE id = ?').get(r.reporterId) as any;

    // Resolve a short preview of the reported item + whether it still exists.
    let targetPreview = '';
    let targetExists = false;
    const map = TARGET_TABLES[r.targetType];
    if (map) {
      try {
        const t = await db.prepare(`SELECT ${map.preview} AS preview FROM ${map.table} WHERE id = ?`).get(r.targetId) as any;
        if (t) { targetExists = true; targetPreview = (t.preview || '').toString().slice(0, 140); }
      } catch { /* unknown table — leave defaults */ }
    }

    out.push({
      id: r.id,
      reporterId: r.reporterId,
      reporterName: reporter?.name || reporter?.username || 'Unknown',
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      reasonLabel: reportReasonLabel(r.reason),
      description: r.description || '',
      status: r.status || 'pending',
      createdAt: r.createdAt,
      targetPreview,
      targetExists,
    });
  }
  return NextResponse.json(out);
}

// PATCH /api/admin/reports  { reportId, action: 'resolve' | 'dismiss' | 'deleteTarget' }
// - resolve/dismiss: just update the report status.
// - deleteTarget: delete the reported post (only supported for post targets) and resolve.
export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { reportId, action } = await request.json().catch(() => ({}));
  if (!reportId || !action) return NextResponse.json({ error: 'reportId and action are required' }, { status: 400 });

  const db = await getDb();
  const report = await db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId) as any;
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  if (action === 'resolve') {
    await db.prepare("UPDATE reports SET status = 'resolved' WHERE id = ?").run(reportId);
    return NextResponse.json({ success: true, status: 'resolved' });
  }
  if (action === 'dismiss') {
    await db.prepare("UPDATE reports SET status = 'dismissed' WHERE id = ?").run(reportId);
    return NextResponse.json({ success: true, status: 'dismissed' });
  }
  if (action === 'deleteTarget') {
    if (report.targetType === 'post') {
      await deletePostCascade(report.targetId);
    } else {
      // For non-post targets, delete the row from its table if we know it.
      const map = TARGET_TABLES[report.targetType];
      if (map) { try { await db.prepare(`DELETE FROM ${map.table} WHERE id = ?`).run(report.targetId); } catch { /* ignore */ } }
    }
    await db.prepare("UPDATE reports SET status = 'resolved' WHERE id = ?").run(reportId);
    return NextResponse.json({ success: true, status: 'resolved', deleted: true });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
