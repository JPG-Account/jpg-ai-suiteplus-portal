import { NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getPool } from "../../../../lib/db/client";
import { writeAudit } from "../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async () => {
  const pool = await getPool();
  const { rows } = await pool.query<any>(
    "SELECT * FROM capability ORDER BY sort_order",
  );
  return NextResponse.json({
    capabilities: rows.map((c: any) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      shortName: c.short_name,
      type: c.type,
      status: c.status,
      primaryLaneId: c.primary_lane_id,
      secondaryLaneIds: JSON.parse(c.secondary_lane_ids_json),
      description: c.description,
      features: JSON.parse(c.features_json),
      enabled: !!c.enabled,
      sortOrder: c.sort_order,
    })),
  });
});

// PATCH — toggle the enabled flag. Scope kept minimal on purpose: name,
// description, features, lanes, status remain editorial copy that goes
// through code/seed. Enabled is the operational switch admins need most.
const PatchBody = z.object({
  id: z.string(),
  enabled: z.boolean(),
});

export const PATCH = withSuperAdmin(async (req, ctx) => {
  const body = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { id, enabled } = parsed.data;

  const pool = await getPool();
  const before = await pool.query<any>(
    "SELECT id, slug, name, enabled FROM capability WHERE id = $1",
    [id],
  );
  if (before.rowCount === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const beforeRow = before.rows[0];
  if (beforeRow.enabled === enabled) {
    // No-op — return current state without writing audit
    return NextResponse.json({ ok: true, capability: { id, enabled } });
  }

  await pool.query("UPDATE capability SET enabled = $1 WHERE id = $2", [enabled, id]);

  await writeAudit({
    actorUserId: ctx.user.id,
    action: enabled ? "capability.enabled" : "capability.disabled",
    entityType: "capability",
    entityId: id,
    before: { enabled: beforeRow.enabled },
    after: { enabled },
  });

  return NextResponse.json({ ok: true, capability: { id, enabled, slug: beforeRow.slug, name: beforeRow.name } });
});
