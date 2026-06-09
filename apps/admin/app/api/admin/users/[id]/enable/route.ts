// V0.9-Crawl-A · re-enable a previously disabled user.
// Flips status back to 'active', clears the forever-lock on password_credential.
// Does NOT reset their password — admin must issue a fresh reset link separately
// if the original credential should be invalidated.
import { NextResponse } from "next/server";
import { withSuperAdmin } from "../../../../../../lib/auth/guard";
import { getPool } from "../../../../../../lib/db/client";
import { writeAudit } from "../../../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withSuperAdmin(async (_req, ctx) => {
  const { id } = (ctx as any).params ?? { id: "" };
  const pool = await getPool();
  const userRes = await pool.query<any>(
    "SELECT * FROM user_account WHERE id = $1",
    [id],
  );
  const user = userRes.rows[0];
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (user.status !== "disabled") {
    return NextResponse.json(
      { error: "not_disabled", message: "User is not currently disabled" },
      { status: 409 },
    );
  }

  await pool.query("UPDATE user_account SET status = 'active' WHERE id = $1", [id]);
  await pool.query(
    "UPDATE password_credential SET locked_until = NULL, failed_attempts = 0 WHERE user_id = $1",
    [id],
  );

  await writeAudit({
    actorUserId: ctx.user.id,
    action: "auth.user.enabled",
    entityType: "user_account",
    entityId: id,
    before: { status: "disabled" },
    after: { status: "active" },
  });
  return NextResponse.json({ ok: true });
});
