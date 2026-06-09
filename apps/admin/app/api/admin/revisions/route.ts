import { NextResponse } from "next/server";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getSqlite } from "../../../../lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async () => {
  const rows = getSqlite().prepare(`
    SELECT cr.revision_number, cr.published_at, cr.notes, cr.is_current,
           u.email AS published_by_email, u.display_name AS published_by_name
    FROM config_revision cr
    LEFT JOIN user_account u ON u.id = cr.published_by
    ORDER BY cr.revision_number DESC
    LIMIT 100
  `).all() as any[];
  return NextResponse.json({
    revisions: rows.map((r) => ({
      revisionNumber: r.revision_number,
      publishedAt: new Date(r.published_at).toISOString(),
      publishedBy: { email: r.published_by_email, name: r.published_by_name },
      notes: r.notes,
      isCurrent: !!r.is_current,
    })),
  });
});
