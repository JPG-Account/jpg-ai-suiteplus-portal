import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { withSuperAdmin } from "../../../../../lib/auth/guard";
import { getSqlite } from "../../../../../lib/db/client";
import { writeAudit } from "../../../../../lib/audit";
import { BLOCK_TYPE_REGISTRY } from "../../../../../lib/composer/block-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({
  pageKey: z.string().default("home"),
  blockType: z.string(),
  label: z.string().optional(),
  insertAfter: z.string().nullable().optional(),
});

export const POST = withSuperAdmin(async (req, ctx) => {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  const { pageKey, blockType, label, insertAfter } = parsed.data;

  const def = BLOCK_TYPE_REGISTRY[blockType];
  if (!def) return NextResponse.json({ error: "unknown_block_type" }, { status: 400 });

  const db = getSqlite();
  const all = db.prepare(`SELECT id, position FROM page_block WHERE page_key = ? ORDER BY position`).all(pageKey) as any[];
  let insertPos = all.length;
  if (insertAfter) {
    const idx = all.findIndex((r) => r.id === insertAfter);
    if (idx >= 0) insertPos = idx + 1;
  }

  const id = `blk_${pageKey}_${blockType}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;

  const txn = db.transaction(() => {
    // Make room
    db.prepare(`UPDATE page_block SET position = position + 1 WHERE page_key = ? AND position >= ?`).run(pageKey, insertPos);
    db.prepare(`
      INSERT INTO page_block (id, page_key, block_type, label, subtitle, position, fields_json, style_json, html_payload, is_enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id, pageKey, blockType,
      label ?? def.defaultLabel,
      def.defaultSubtitle ?? null,
      insertPos,
      JSON.stringify(def.defaultFields ?? {}),
      JSON.stringify(def.defaultStyle ?? {}),
      def.defaultHtmlPayload ?? null,
    );
  });
  txn();

  const after = db.prepare(`SELECT * FROM page_block WHERE id = ?`).get(id);
  writeAudit({ actorUserId: ctx.user.id, action: "block.created", entityType: "page_block", entityId: id, after });
  return NextResponse.json({ ok: true, block: after }, { status: 201 });
});
