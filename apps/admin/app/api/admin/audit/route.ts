import { NextResponse } from "next/server";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getPool } from "../../../../lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async (req) => {
  const limit = Math.min(
    parseInt(new URL(req.url).searchParams.get("limit") ?? "100", 10),
    500,
  );
  const pool = await getPool();
  const { rows } = await pool.query<any>(
    `SELECT ae.*, u.email AS actor_email, u.display_name AS actor_name
     FROM audit_event ae
     LEFT JOIN user_account u ON u.id = ae.actor_user_id
     ORDER BY ae.created_at DESC
     LIMIT $1`,
    [limit],
  );
  return NextResponse.json({
    events: rows.map((r) => ({
      id: r.id,
      ts: new Date(Number(r.created_at)).toISOString(),
      actor: r.actor_email ? { email: r.actor_email, name: r.actor_name } : null,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      before: r.before_json ? JSON.parse(r.before_json) : null,
      after: r.after_json ? JSON.parse(r.after_json) : null,
    })),
  });
});
