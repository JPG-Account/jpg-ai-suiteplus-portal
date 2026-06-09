import { NextResponse } from "next/server";
import { withSuperAdmin } from "../../../../../lib/auth/guard";
import { getPool } from "../../../../../lib/db/client";
import { writeAudit } from "../../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = withSuperAdmin(async (_req, ctx) => {
  const { id } = (ctx as any).params ?? { id: "" };
  const pool = await getPool();
  const { rows } = await pool.query<any>(
    "SELECT * FROM page_block WHERE id = $1",
    [id],
  );
  const before = rows[0];
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Transaction: delete + reorder remaining blocks in same page
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM page_block WHERE id = $1", [id]);
    await client.query(
      "UPDATE page_block SET position = position - 1 WHERE page_key = $1 AND position > $2",
      [before.page_key, before.position],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  await writeAudit({
    actorUserId: ctx.user.id,
    action: "block.deleted",
    entityType: "page_block",
    entityId: id,
    before,
  });
  return NextResponse.json({ ok: true });
});
