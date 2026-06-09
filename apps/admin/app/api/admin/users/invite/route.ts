import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "../../../../../lib/auth/guard";
import { getSqlite } from "../../../../../lib/db/client";
import { writeAudit } from "../../../../../lib/audit";
import { isEmailAllowed } from "../../../../../lib/auth/domain-allowlist";
import { createInviteToken } from "../../../../../lib/auth/local-password-provider";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(120),
  role: z.enum(["super_admin", "editor", "viewer"]).default("viewer"),
  confirmSuperAdmin: z.boolean().optional(),
});

export const POST = withSuperAdmin(async (req, ctx) => {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { email, displayName, role, confirmSuperAdmin } = parsed.data;
  if (role === "super_admin" && !confirmSuperAdmin) {
    return NextResponse.json({ error: "super_admin_confirmation_required", message: "Granting Super Admin requires explicit confirmation in the request body (confirmSuperAdmin: true)." }, { status: 400 });
  }
  if (!isEmailAllowed(email)) {
    return NextResponse.json({ error: "domain_not_allowed", message: "Email domain is not in the allow-list" }, { status: 400 });
  }

  const db = getSqlite();
  const lowered = email.trim().toLowerCase();
  const existing = db.prepare(`SELECT * FROM user_account WHERE email = ?`).get(lowered) as any;

  let userId: string;
  if (existing) {
    if (existing.status === "active") {
      return NextResponse.json({ error: "already_active", message: "User already active; use reset link instead" }, { status: 409 });
    }
    userId = existing.id;
  } else {
    userId = `u_${randomUUID()}`;
    const now = Date.now();
    db.prepare(`INSERT INTO user_account (id, email, display_name, created_at, status, invited_by, invited_at) VALUES (?, ?, ?, ?, 'invited', ?, ?)`)
      .run(userId, lowered, displayName, now, ctx.user.id, now);
    db.prepare(`INSERT INTO role_mapping (id, user_id, role, granted_at) VALUES (?, ?, ?, ?)`)
      .run(randomUUID(), userId, role, now);
  }

  const { rawToken, expiresAt } = createInviteToken(db, userId, 72);

  writeAudit({
    actorUserId: ctx.user.id,
    action: "auth.user.invited",
    entityType: "user_account",
    entityId: userId,
    after: { email: lowered, role, expiresAt: new Date(expiresAt).toISOString() },
  });

  const url = new URL(req.url);
  const setPasswordUrl = `${url.origin}/set-password?token=${encodeURIComponent(rawToken)}`;

  return NextResponse.json({
    ok: true,
    userId,
    email: lowered,
    setPasswordUrl,
    expiresAt: new Date(expiresAt).toISOString(),
  }, { status: 201 });
});
