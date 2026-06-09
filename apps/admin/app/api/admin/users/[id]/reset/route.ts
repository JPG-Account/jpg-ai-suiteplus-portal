import { NextRequest, NextResponse } from "next/server";
import { withSuperAdmin } from "../../../../../../lib/auth/guard";
import { getSqlite } from "../../../../../../lib/db/client";
import { writeAudit } from "../../../../../../lib/audit";
import { createInviteToken } from "../../../../../../lib/auth/local-password-provider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withSuperAdmin(async (req, ctx) => {
  const { id } = (ctx as any).params ?? { id: "" };
  const db = getSqlite();
  const user = db.prepare(`SELECT * FROM user_account WHERE id = ?`).get(id) as any;
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { rawToken, expiresAt } = createInviteToken(db, id, 24);

  writeAudit({
    actorUserId: ctx.user.id,
    action: "auth.password.reset_issued",
    entityType: "user_account",
    entityId: id,
    after: { email: user.email, expiresAt: new Date(expiresAt).toISOString() },
  });

  const url = new URL(req.url);
  const setPasswordUrl = `${url.origin}/set-password?token=${encodeURIComponent(rawToken)}`;
  return NextResponse.json({ ok: true, setPasswordUrl, expiresAt: new Date(expiresAt).toISOString() });
});
