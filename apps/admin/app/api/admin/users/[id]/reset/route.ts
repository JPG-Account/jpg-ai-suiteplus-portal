import { NextResponse } from "next/server";
import { withSuperAdmin } from "../../../../../../lib/auth/guard";
import { getPool } from "../../../../../../lib/db/client";
import { writeAudit } from "../../../../../../lib/audit";
import { createInviteToken } from "../../../../../../lib/auth/local-password-provider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withSuperAdmin(async (req, ctx) => {
  const { id } = (ctx as any).params ?? { id: "" };
  const pool = await getPool();
  const userRes = await pool.query<any>(
    "SELECT * FROM user_account WHERE id = $1",
    [id],
  );
  const user = userRes.rows[0];
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { rawToken, expiresAt } = await createInviteToken(id, 24);

  await writeAudit({
    actorUserId: ctx.user.id,
    action: "auth.password.reset_issued",
    entityType: "user_account",
    entityId: id,
    after: { email: user.email, expiresAt: new Date(expiresAt).toISOString() },
  });

  const url = new URL(req.url);
  const setPasswordUrl = `${url.origin}/set-password?token=${encodeURIComponent(rawToken)}`;
  return NextResponse.json({
    ok: true,
    setPasswordUrl,
    expiresAt: new Date(expiresAt).toISOString(),
  });
});
