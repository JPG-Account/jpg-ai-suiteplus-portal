import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getSqlite } from "../../../../lib/db/client";
import { writeAudit } from "../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async (req) => {
  const pageKey = new URL(req.url).searchParams.get("pageKey") ?? "home";
  const rows = getSqlite().prepare(`SELECT * FROM page_block WHERE page_key = ? ORDER BY position`).all(pageKey) as any[];
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

function safeJson(s: string) { try { return JSON.parse(s); } catch { return {}; } }

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
  if (!parsed.success) return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  const { id, ...patch } = parsed.data;

  const db = getSqlite();
  const before = db.prepare(`SELECT * FROM page_block WHERE id = ?`).get(id) as any;
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const fields: string[] = [];
  const values: any[] = [];
  if (patch.fields !== undefined) { fields.push("fields_json = ?"); values.push(JSON.stringify(patch.fields)); }
  if (patch.label !== undefined) { fields.push("label = ?"); values.push(patch.label); }
  if (patch.subtitle !== undefined) { fields.push("subtitle = ?"); values.push(patch.subtitle); }
  if (patch.isEnabled !== undefined) { fields.push("is_enabled = ?"); values.push(patch.isEnabled ? 1 : 0); }
  if (patch.blockType !== undefined) { fields.push("block_type = ?"); values.push(patch.blockType); }
  if (patch.style !== undefined) { fields.push("style_json = ?"); values.push(JSON.stringify(patch.style)); }
  if (patch.htmlPayload !== undefined) { fields.push("html_payload = ?"); values.push(patch.htmlPayload); }

  if (fields.length === 0) return NextResponse.json({ ok: true, unchanged: true });

  db.prepare(`UPDATE page_block SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
  const after = db.prepare(`SELECT * FROM page_block WHERE id = ?`).get(id);

  writeAudit({
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
  if (!parsed.success) return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  const { pageKey, order } = parsed.data;

  const db = getSqlite();
  const existing = db.prepare(`SELECT id FROM page_block WHERE page_key = ?`).all(pageKey) as any[];
  const knownIds = new Set(existing.map((r) => r.id));
  if (order.some((id) => !knownIds.has(id))) {
    return NextResponse.json({ error: "unknown_block_id" }, { status: 400 });
  }
  const txn = db.transaction((ids: string[]) => {
    ids.forEach((id, i) => db.prepare(`UPDATE page_block SET position = ? WHERE id = ?`).run(i, id));
  });
  txn(order);

  writeAudit({
    actorUserId: ctx.user.id,
    action: "block.reordered",
    entityType: "page",
    entityId: pageKey,
    after: { order },
  });

  return NextResponse.json({ ok: true });
});
