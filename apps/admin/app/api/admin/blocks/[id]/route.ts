import { NextRequest, NextResponse } from "next/server";
import { withSuperAdmin } from "../../../../../lib/auth/guard";
import { getSqlite } from "../../../../../lib/db/client";
import { writeAudit } from "../../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = withSuperAdmin(async (_req, ctx) => {
  const { id } = (ctx as any).params ?? { id: "" };
  const db = getSqlite();
  const before = db.prepare(`SELECT * FROM page_block WHERE id = ?`).get(id) as any;
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const txn = db.transaction(() => {
    db.prepare(`DELETE FROM page_block WHERE id = ?`).run(id);
    db.prepare(`UPDATE page_block SET position = position - 1 WHERE page_key = ? AND position > ?`).run(before.page_key, before.position);
  });
  txn();

  writeAudit({ actorUserId: ctx.user.id, action: "block.deleted", entityType: "page_block", entityId: id, before });
  return NextResponse.json({ ok: true });
});
