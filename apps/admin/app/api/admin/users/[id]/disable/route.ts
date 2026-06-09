import { NextResponse } from "next/server";
import { withSuperAdmin } from "../../../../../../lib/auth/guard";
import { getPool } from "../../../../../../lib/db/client";
import { writeAudit } from "../../../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withSuperAdmin(async (_req, ctx) => {
  const { id } = (ctx as any).params ?? { id: "" };
  if (id === ctx.user.id) {
    return NextResponse.json(
      { error: "self_action", message: "Cannot disable yourself" },
      { status: 400 },
    );
  }
  const pool = await getPool();
  const userRes = await pool.query<any>(
    "SELECT * FROM user_account WHERE id = $1",
    [id],
  );
  const user = userRes.rows[0];
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await pool.query("UPDATE user_account SET status = 'disabled' WHERE id = $1", [id]);
  await pool.query("DELETE FROM session WHERE user_id = $1", [id]);
  // Effectively forever (max JS Date)
  await pool.query(
    "UPDATE password_credential SET locked_until = $1 WHERE user_id = $2",
    [8640000000000000, id],
  );

  await writeAudit({
    actorUserId: ctx.user.id,
    action: "auth.user.disabled",
    entityType: "user_account",
    entityId: id,
    before: { status: user.status },
    after: { status: "disabled" },
  });
  return NextResponse.json({ ok: true });
});
