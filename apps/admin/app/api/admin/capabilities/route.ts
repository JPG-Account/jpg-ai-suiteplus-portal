import { NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getPool } from "../../../../lib/db/client";
import { writeAudit } from "../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ───────────────────── GET — list all capabilities ─────────────────────

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
      searchKeywords: c.search_keywords,
      enabled: !!c.enabled,
      sortOrder: c.sort_order,
    })),
  });
});

// ───────────────────── Shared shapes + validators ──────────────────────

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const Fields = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(60).regex(SLUG_RE, "slug must be lowercase, hyphen-separated"),
  shortName: z.string().max(100).nullable().optional(),
  type: z.string().min(1).max(100),
  status: z.enum(["live", "demo", "available"]),
  primaryLaneId: z.string().min(1),
  secondaryLaneIds: z.array(z.string()).max(8).default([]),
  description: z.string().min(1).max(800),
  features: z.array(z.string().min(1).max(300)).max(10).default([]),
  searchKeywords: z.string().max(500).default(""),
  enabled: z.boolean().optional(),
});

async function validateLaneIds(pool: any, primary: string, secondary: string[]) {
  const all = Array.from(new Set([primary, ...secondary]));
  // Note: pool is typed `any`, so we can't pass a type arg to .query() —
  // TS strict mode forbids type args on calls to untyped values.
  const res = await pool.query(
    `SELECT id FROM lane WHERE id = ANY($1::text[])`,
    [all],
  );
  const found = new Set(res.rows.map((r: any) => r.id));
  const missing = all.filter((id) => !found.has(id));
  return missing as string[];
}

// ───────────────────── PATCH — full update OR enabled-only ──────────────

const PatchBody = z.union([
  // Enabled-only quick toggle (kept for the per-row button)
  z.object({ id: z.string(), enabled: z.boolean() }).strict(),
  // Full edit
  z.object({ id: z.string() }).merge(Fields.partial()),
]);

export const PATCH = withSuperAdmin(async (req, ctx) => {
  const body = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { id, ...patch } = parsed.data as any;
  const pool = await getPool();

  const beforeRes = await pool.query<any>("SELECT * FROM capability WHERE id = $1", [id]);
  if ((beforeRes.rowCount ?? 0) === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const before = beforeRes.rows[0];

  // If slug is changing, ensure uniqueness
  if (patch.slug && patch.slug !== before.slug) {
    const dup = await pool.query<any>(
      "SELECT id FROM capability WHERE slug = $1 AND id <> $2",
      [patch.slug, id],
    );
    if ((dup.rowCount ?? 0) > 0) {
      return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    }
  }

  // Validate lane ids if provided
  if (patch.primaryLaneId || patch.secondaryLaneIds) {
    const primary = patch.primaryLaneId ?? before.primary_lane_id;
    const secondary = patch.secondaryLaneIds ?? JSON.parse(before.secondary_lane_ids_json);
    const missing = await validateLaneIds(pool, primary, secondary);
    if (missing.length) {
      return NextResponse.json({ error: "invalid_lane_ids", missing }, { status: 400 });
    }
  }

  // Build dynamic UPDATE
  const sets: string[] = [];
  const values: any[] = [];
  let i = 1;
  const setIf = (col: string, val: unknown) => {
    if (val === undefined) return;
    sets.push(`${col} = $${i}`);
    values.push(val);
    i++;
  };
  setIf("name", patch.name);
  setIf("slug", patch.slug);
  setIf("short_name", patch.shortName === "" ? null : patch.shortName);
  setIf("type", patch.type);
  setIf("status", patch.status);
  setIf("primary_lane_id", patch.primaryLaneId);
  if (patch.secondaryLaneIds !== undefined)
    setIf("secondary_lane_ids_json", JSON.stringify(patch.secondaryLaneIds));
  setIf("description", patch.description);
  if (patch.features !== undefined)
    setIf("features_json", JSON.stringify(patch.features));
  setIf("search_keywords", patch.searchKeywords);
  setIf("enabled", patch.enabled);

  if (sets.length === 0) {
    return NextResponse.json({ ok: true, capability: { id, noop: true } });
  }
  values.push(id);
  await pool.query(
    `UPDATE capability SET ${sets.join(", ")} WHERE id = $${i}`,
    values,
  );

  // Audit
  await writeAudit({
    actorUserId: ctx.user.id,
    action:
      "enabled" in patch && Object.keys(patch).length === 1
        ? patch.enabled
          ? "capability.enabled"
          : "capability.disabled"
        : "capability.updated",
    entityType: "capability",
    entityId: id,
    before: {
      name: before.name,
      enabled: before.enabled,
      slug: before.slug,
    },
    after: patch,
  });

  return NextResponse.json({ ok: true, capability: { id, ...patch } });
});

// ───────────────────── POST — create new capability ────────────────────

const PostBody = Fields.extend({
  enabled: z.boolean().default(true),
});

export const POST = withSuperAdmin(async (req, ctx) => {
  const body = await req.json().catch(() => null);
  const parsed = PostBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const pool = await getPool();

  // Uniqueness
  const dup = await pool.query<any>(
    "SELECT id FROM capability WHERE slug = $1",
    [data.slug],
  );
  if ((dup.rowCount ?? 0) > 0) {
    return NextResponse.json({ error: "slug_taken" }, { status: 409 });
  }

  // Lane validation
  const missing = await validateLaneIds(pool, data.primaryLaneId, data.secondaryLaneIds);
  if (missing.length) {
    return NextResponse.json({ error: "invalid_lane_ids", missing }, { status: 400 });
  }

  // Next sort_order
  const maxRes = await pool.query<any>(
    "SELECT COALESCE(MAX(sort_order), -1) AS m FROM capability",
  );
  const nextSort = Number(maxRes.rows[0]?.m ?? -1) + 1;
  const capId = `cap_${data.slug}`;

  await pool.query(
    `INSERT INTO capability
      (id, slug, name, short_name, type, status, primary_lane_id, secondary_lane_ids_json,
       description, features_json, search_keywords, enabled, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      capId,
      data.slug,
      data.name,
      data.shortName ?? null,
      data.type,
      data.status,
      data.primaryLaneId,
      JSON.stringify(data.secondaryLaneIds),
      data.description,
      JSON.stringify(data.features),
      data.searchKeywords,
      data.enabled,
      nextSort,
    ],
  );

  // Auto-create the matching tile so the capability has a routable surface
  await pool.query(
    `INSERT INTO tile
      (id, capability_id, route_kind, route_template, external_url, visibility, sort_order)
     VALUES ($1, $2, 'internal', $3, NULL, 'public', $4)`,
    [`tile_${data.slug}`, capId, `/capabilities/${data.slug}`, nextSort],
  );

  await writeAudit({
    actorUserId: ctx.user.id,
    action: "capability.created",
    entityType: "capability",
    entityId: capId,
    after: { slug: data.slug, name: data.name },
  });

  return NextResponse.json({ ok: true, capability: { id: capId, ...data } }, { status: 201 });
});

// ───────────────────── DELETE — remove capability + tile ───────────────

export const DELETE = withSuperAdmin(async (req, ctx) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id_required" }, { status: 400 });
  }
  const pool = await getPool();

  const beforeRes = await pool.query<any>(
    "SELECT id, slug, name FROM capability WHERE id = $1",
    [id],
  );
  if ((beforeRes.rowCount ?? 0) === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const before = beforeRes.rows[0];

  // Tile FK → must delete tile first
  await pool.query("DELETE FROM tile WHERE capability_id = $1", [id]);
  await pool.query("DELETE FROM capability WHERE id = $1", [id]);

  await writeAudit({
    actorUserId: ctx.user.id,
    action: "capability.deleted",
    entityType: "capability",
    entityId: id,
    before: { slug: before.slug, name: before.name },
  });

  return NextResponse.json({ ok: true, deleted: id });
});
