import { NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getPool } from "../../../../lib/db/client";
import { writeAudit } from "../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async (req) => {
  const pageKey = new URL(req.url).searchParams.get("pageKey") ?? "home";
  const pool = await getPool();
  const { rows } = await pool.query<any>(
    "SELECT * FROM page_block WHERE page_key = $1 ORDER BY position",
    [pageKey],
  );
  return NextResponse.json({
    blocks: rows.map((b) => ({
      id: b.id,
      pageKey: b.page_key,
      type: b.block_type,
      label: b.label,
      subtitle: b.subtitle,
      position: b.position,
      fields: JSON.parse(b.fields_json),
      style: b.style_json ? safeJson(b.style_json) : {},
      htmlPayload: b.html_payload ?? null,
      isEnabled: !!b.is_enabled,
    })),
  });
});

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

const PatchBody = z.object({
  id: z.string(),
  fields: z.record(z.any()).optional(),
  label: z.string().optional(),
  subtitle: z.string().nullable().optional(),
  isEnabled: z.boolean().optional(),
  blockType: z.string().optional(),
  style: z.record(z.any()).optional(),
  htmlPayload: z.string().nullable().optional(),
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
    "SELECT * FROM page_block WHERE id = $1",
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
  if (patch.fields !== undefined) add("fields_json", JSON.stringify(patch.fields));
  if (patch.label !== undefined) add("label", patch.label);
  if (patch.subtitle !== undefined) add("subtitle", patch.subtitle);
  if (patch.isEnabled !== undefined) add("is_enabled", patch.isEnabled);
  if (patch.blockType !== undefined) add("block_type", patch.blockType);
  if (patch.style !== undefined) add("style_json", JSON.stringify(patch.style));
  if (patch.htmlPayload !== undefined) add("html_payload", patch.htmlPayload);

  if (fields.length === 0) return NextResponse.json({ ok: true, unchanged: true });

  const sql = `UPDATE page_block SET ${fields.join(", ")} WHERE id = $${pos}`;
  values.push(id);
  await pool.query(sql, values);

  const { rows: afterRows } = await pool.query<any>(
    "SELECT * FROM page_block WHERE id = $1",
    [id],
  );
  const after = afterRows[0];

  await writeAudit({
    actorUserId: ctx.user.id,
    action: "block.updated",
    entityType: "page_block",
    entityId: id,
    before,
    after,
  });

  return NextResponse.json({ ok: true, block: after });
});

const ReorderBody = z.object({
  pageKey: z.string(),
  order: z.array(z.string()).min(1),
});

export const POST = withSuperAdmin(async (req, ctx) => {
  // Reorder endpoint — body: { pageKey, order: [blockId,...] }
  const body = await req.json().catch(() => null);
  const parsed = ReorderBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { pageKey, order } = parsed.data;

  const pool = await getPool();
  const { rows: existing } = await pool.query<any>(
    "SELECT id FROM page_block WHERE page_key = $1",
    [pageKey],
  );
  const knownIds = new Set(existing.map((r) => r.id));
  if (order.some((id) => !knownIds.has(id))) {
    return NextResponse.json({ error: "unknown_block_id" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < order.length; i++) {
      await client.query("UPDATE page_block SET position = $1 WHERE id = $2", [i, order[i]]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  await writeAudit({
    actorUserId: ctx.user.id,
    action: "block.reordered",
    entityType: "page",
    entityId: pageKey,
    after: { order },
  });

  return NextResponse.json({ ok: true });
});
