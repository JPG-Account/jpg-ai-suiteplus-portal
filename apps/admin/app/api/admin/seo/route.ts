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
    "SELECT * FROM seo_default ORDER BY scope",
  );
  return NextResponse.json({
    seo: rows.map((r) => ({
      id: r.id,
      scope: r.scope,
      titleTemplate: r.title_template,
      description: r.description,
      canonicalHost: r.canonical_host,
      ogPayload: JSON.parse(r.og_payload_json),
      updatedAt: new Date(Number(r.updated_at)).toISOString(),
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
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { scope, ...patch } = parsed.data;

  const pool = await getPool();
  const { rows: beforeRows } = await pool.query<any>(
    "SELECT * FROM seo_default WHERE scope = $1",
    [scope],
  );
  const before = beforeRows[0];
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Build dynamic SET clause with positional placeholders.
  const fields: string[] = [];
  const values: any[] = [];
  let pos = 1;
  const add = (col: string, val: any) => {
    fields.push(`${col} = $${pos++}`);
    values.push(val);
  };
  if (patch.titleTemplate !== undefined) add("title_template", patch.titleTemplate);
  if (patch.description !== undefined) add("description", patch.description);
  if (patch.canonicalHost !== undefined) add("canonical_host", patch.canonicalHost);
  if (patch.ogPayload !== undefined) add("og_payload_json", JSON.stringify(patch.ogPayload));
  add("updated_at", Date.now());

  const sql = `UPDATE seo_default SET ${fields.join(", ")} WHERE scope = $${pos}`;
  values.push(scope);
  await pool.query(sql, values);

  const { rows: afterRows } = await pool.query<any>(
    "SELECT * FROM seo_default WHERE scope = $1",
    [scope],
  );
  const after = afterRows[0];

  await writeAudit({
    actorUserId: ctx.user.id,
    action: "seo.updated",
    entityType: "seo_default",
    entityId: scope,
    before,
    after,
  });

  return NextResponse.json({ ok: true, seo: after });
});
