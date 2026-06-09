import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getSqlite } from "../../../../lib/db/client";
import { writeAudit } from "../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async () => {
  const rows = getSqlite().prepare(`SELECT * FROM seo_default ORDER BY scope`).all() as any[];
  return NextResponse.json({
    seo: rows.map((r) => ({
      id: r.id,
      scope: r.scope,
      titleTemplate: r.title_template,
      description: r.description,
      canonicalHost: r.canonical_host,
      ogPayload: JSON.parse(r.og_payload_json),
      updatedAt: new Date(r.updated_at).toISOString(),
    })),
  });
});

const PatchBody = z.object({
  scope: z.string(),
  titleTemplate: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  canonicalHost: z.string().url().optional(),
  ogPayload: z.record(z.any()).optional(),
});

export const PATCH = withSuperAdmin(async (req, ctx) => {
  const body = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  const { scope, ...patch } = parsed.data;

  const db = getSqlite();
  const before = db.prepare(`SELECT * FROM seo_default WHERE scope = ?`).get(scope) as any;
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const fields: string[] = [];
  const values: any[] = [];
  if (patch.titleTemplate !== undefined) { fields.push("title_template = ?"); values.push(patch.titleTemplate); }
  if (patch.description !== undefined) { fields.push("description = ?"); values.push(patch.description); }
  if (patch.canonicalHost !== undefined) { fields.push("canonical_host = ?"); values.push(patch.canonicalHost); }
  if (patch.ogPayload !== undefined) { fields.push("og_payload_json = ?"); values.push(JSON.stringify(patch.ogPayload)); }
  fields.push("updated_at = ?"); values.push(Date.now());

  db.prepare(`UPDATE seo_default SET ${fields.join(", ")} WHERE scope = ?`).run(...values, scope);
  const after = db.prepare(`SELECT * FROM seo_default WHERE scope = ?`).get(scope);

  writeAudit({
    actorUserId: ctx.user.id,
    action: "seo.updated",
    entityType: "seo_default",
    entityId: scope,
    before,
    after,
  });

  return NextResponse.json({ ok: true, seo: after });
});
