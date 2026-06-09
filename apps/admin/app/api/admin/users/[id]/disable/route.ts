import { NextRequest, NextResponse } from "next/server";
import { withSuperAdmin } from "../../../../../../lib/auth/guard";
import { getSqlite } from "../../../../../../lib/db/client";
import { writeAudit } from "../../../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withSuperAdmin(async (_req, ctx) => {
  const { id } = (ctx as any).params ?? { id: "" };
  if (id === ctx.user.id) return NextResponse.json({ error: "self_action", message: "Cannot disable yourself" }, { status: 400 });
  const db = getSqlite();
  const user = db.prepare(`SELECT * FROM user_account WHERE id = ?`).get(id) as any;
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  db.prepare(`UPDATE user_account SET status = 'disabled' WHERE id = ?`).run(id);
  db.prepare(`DELETE FROM session WHERE user_id = ?`).run(id);
  db.prepare(`UPDATE password_credential SET locked_until = ? WHERE user_id = ?`).run(8640000000000000, id); // effectively forever

  writeAudit({
    actorUserId: ctx.user.id,
    action: "auth.user.disabled",
    entityType: "user_account",
    entityId: id,
    before: { status: user.status },
    after: { status: "disabled" },
  });
  return NextResponse.json({ ok: true });
});
