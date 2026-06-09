import { NextResponse } from "next/server";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getSqlite } from "../../../../lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async () => {
  const rows = getSqlite().prepare(`
    SELECT u.id, u.email, u.display_name, u.created_at, u.status,
           rm.role, rm.granted_at,
           (SELECT MAX(s.last_seen_at) FROM session s WHERE s.user_id = u.id) AS last_active
    FROM user_account u
    LEFT JOIN role_mapping rm ON rm.user_id = u.id
    ORDER BY u.created_at DESC
  `).all() as any[];

  return NextResponse.json({
    users: rows.map((r) => ({
      id: r.id,
      email: r.email,
      displayName: r.display_name,
      role: r.role ?? "viewer",
      status: r.status ?? "active",
      grantedAt: r.granted_at ? new Date(r.granted_at).toISOString() : null,
      lastActive: r.last_active ? new Date(r.last_active).toISOString() : null,
      createdAt: new Date(r.created_at).toISOString(),
    })),
  });
});
