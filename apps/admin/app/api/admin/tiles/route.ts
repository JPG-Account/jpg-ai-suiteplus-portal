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
    `SELECT t.*, c.slug AS capability_slug, c.name AS capability_name
     FROM tile t
     INNER JOIN capability c ON c.id = t.capability_id
     ORDER BY t.sort_order`,
  );
  return NextResponse.json({
    tiles: rows.map((t) => ({
      id: t.id,
      capabilityId: t.capability_id,
      capabilitySlug: t.capability_slug,
      capabilityName: t.capability_name,
      routeKind: t.route_kind,
      routeTemplate: t.route_template,
      externalUrl: t.external_url,
      visibility: t.visibility,
      sortOrder: t.sort_order,
    })),
  });
});

// V0.7.1 fix #2 — cross-field consistency between routeKind and externalUrl:
//   external      → externalUrl MUST be a valid URL (not null/missing)
//   internal/soon → externalUrl MUST be null/absent
const PatchBody = z
  .object({
    id: z.string(),
    routeKind: z.enum(["internal", "external", "soon"]).optional(),
    routeTemplate: z.string().min(1).optional(),
    externalUrl: z.string().url().nullable().optional(),
    visibility: z.enum(["public", "role_gated"]).optional(),
  })
  .refine(
    (v) => {
      if (v.routeKind === "external") {
        return typeof v.externalUrl === "string" && v.externalUrl.length > 0;
      }
      if (v.routeKind === "internal" || v.routeKind === "soon") {
        return v.externalUrl == null;
      }
      return true;
    },
    {
      message:
        "routeKind='external' requires externalUrl (URL); routeKind='internal'|'soon' requires externalUrl=null",
      path: ["externalUrl"],
    },
  );

export const PATCH = withSuperAdmin(async (req, ctx) => {
  const body = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { id, ...patch } = parsed.data;

  const pool = await getPool();
  const { rows: beforeRows } = await pool.query<any>(
    "SELECT * FROM tile WHERE id = $1",
    [id],
  );
  const before = beforeRows[0];
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const fields: string[] = [];
  const values: any[] = [];
  let pos = 1;
  const add = (col: string, val: any) => {
    fields.push(`${col} = $${pos++}`);
    values.push(val);
  };
  if (patch.routeKind !== undefined) add("route_kind", patch.routeKind);
  if (patch.routeTemplate !== undefined) add("route_template", patch.routeTemplate);
  if (patch.externalUrl !== undefined) add("external_url", patch.externalUrl);
  if (patch.visibility !== undefined) add("visibility", patch.visibility);

  if (fields.length === 0) return NextResponse.json({ ok: true, unchanged: true });

  const sql = `UPDATE tile SET ${fields.join(", ")} WHERE id = $${pos}`;
  values.push(id);
  await pool.query(sql, values);

  const { rows: afterRows } = await pool.query<any>(
    "SELECT * FROM tile WHERE id = $1",
    [id],
  );
  const after = afterRows[0];

  await writeAudit({
    actorUserId: ctx.user.id,
    action: "tile.updated",
    entityType: "tile",
    entityId: id,
    before,
    after,
  });

  return NextResponse.json({ ok: true, tile: after });
});
