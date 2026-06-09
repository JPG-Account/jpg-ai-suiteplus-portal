import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getSqlite } from "../../../../lib/db/client";
import { writeAudit } from "../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async () => {
  const rows = getSqlite().prepare(`
    SELECT t.*, c.slug AS capability_slug, c.name AS capability_name
    FROM tile t
    INNER JOIN capability c ON c.id = t.capability_id
    ORDER BY t.sort_order
  `).all() as any[];
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
// The portal renderer is tolerant today but a future trust-routeKind-only
// refactor would silently break tiles. Catch the impossible state here.
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
      return true; // routeKind not in patch — leave existing pairing alone
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
    return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { id, ...patch } = parsed.data;

  const db = getSqlite();
  const before = db.prepare(`SELECT * FROM tile WHERE id = ?`).get(id) as any;
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const fields: string[] = [];
  const values: any[] = [];
  if (patch.routeKind !== undefined) { fields.push("route_kind = ?"); values.push(patch.routeKind); }
  if (patch.routeTemplate !== undefined) { fields.push("route_template = ?"); values.push(patch.routeTemplate); }
  if (patch.externalUrl !== undefined) { fields.push("external_url = ?"); values.push(patch.externalUrl); }
  if (patch.visibility !== undefined) { fields.push("visibility = ?"); values.push(patch.visibility); }

  if (fields.length === 0) return NextResponse.json({ ok: true, unchanged: true });

  db.prepare(`UPDATE tile SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
  const after = db.prepare(`SELECT * FROM tile WHERE id = ?`).get(id);

  writeAudit({
    actorUserId: ctx.user.id,
    action: "tile.updated",
    entityType: "tile",
    entityId: id,
    before,
    after,
  });

  return NextResponse.json({ ok: true, tile: after });
});
