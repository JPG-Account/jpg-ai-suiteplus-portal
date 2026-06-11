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
    tiles: rows.map((t: any) => ({
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

// V0.7.2 — cross-field consistency between routeKind and externalUrl:
//   external      → externalUrl MUST be a valid URL (not null/missing)
//   internal/soon → externalUrl is forced to null automatically
// V0.7.1 validated the patch in isolation, which 400'd legitimate partial
// patches (e.g. a routeKind flip when the URL was already stored on the row).
// The invariant is now checked against the MERGED state in the handler.
const PatchBody = z.object({
  id: z.string(),
  routeKind: z.enum(["internal", "external", "soon"]).optional(),
  routeTemplate: z.string().min(1).optional(),
  externalUrl: z.string().url().nullable().optional(),
  visibility: z.enum(["public", "role_gated"]).optional(),
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
  const { id, ...patch } = parsed.data;

  const pool = await getPool();
  const { rows: beforeRows } = await pool.query<any>(
    "SELECT * FROM tile WHERE id = $1",
    [id],
  );
  const before = beforeRows[0];
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Validate the invariant against what the row WILL look like after the
  // patch, falling back to the URL already stored on the row (covers a
  // kind flip that doesn't resend the URL). internal/soon force the URL
  // to null rather than rejecting — the admin's intent is unambiguous.
  const mergedKind = patch.routeKind ?? before.route_kind;
  const mergedUrl =
    patch.externalUrl !== undefined ? patch.externalUrl : before.external_url;
  if (mergedKind === "external" && !mergedUrl) {
    return NextResponse.json(
      {
        error: "bad_request",
        details: {
          fieldErrors: {
            externalUrl: ["An External URL tile needs a destination URL — enter one before saving."],
          },
        },
      },
      { status: 400 },
    );
  }
  if (mergedKind !== "external" && mergedUrl != null) {
    patch.externalUrl = null;
  }

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
