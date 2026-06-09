import { NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "../../../../../lib/auth/guard";
import { getPool } from "../../../../../lib/db/client";
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
    return NextResponse.json(
      { error: "bad_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { email, displayName, role, confirmSuperAdmin } = parsed.data;
  if (role === "super_admin" && !confirmSuperAdmin) {
    return NextResponse.json(
      {
        error: "super_admin_confirmation_required",
        message:
          "Granting Super Admin requires explicit confirmation in the request body (confirmSuperAdmin: true).",
      },
      { status: 400 },
    );
  }
  if (!(await isEmailAllowed(email))) {
    return NextResponse.json(
      { error: "domain_not_allowed", message: "Email domain is not in the allow-list" },
      { status: 400 },
    );
  }

  const pool = await getPool();
  const lowered = email.trim().toLowerCase();
  const { rows: existingRows } = await pool.query<any>(
    "SELECT * FROM user_account WHERE email = $1",
    [lowered],
  );
  const existing = existingRows[0];

  let userId: string;
  if (existing) {
    if (existing.status === "active") {
      return NextResponse.json(
        { error: "already_active", message: "User already active; use reset link instead" },
        { status: 409 },
      );
    }
    userId = existing.id;
  } else {
    userId = `u_${randomUUID()}`;
    const now = Date.now();
    await pool.query(
      `INSERT INTO user_account
        (id, email, display_name, created_at, status, invited_by, invited_at)
       VALUES ($1, $2, $3, $4, 'invited', $5, $6)`,
      [userId, lowered, displayName, now, ctx.user.id, now],
    );
    await pool.query(
      "INSERT INTO role_mapping (id, user_id, role, granted_at) VALUES ($1, $2, $3, $4)",
      [randomUUID(), userId, role, now],
    );
  }

  const { rawToken, expiresAt } = await createInviteToken(userId, 72);

  await writeAudit({
    actorUserId: ctx.user.id,
    action: "auth.user.invited",
    entityType: "user_account",
    entityId: userId,
    after: { email: lowered, role, expiresAt: new Date(expiresAt).toISOString() },
  });

  // Prefer ADMIN_BASE_URL over req.url's origin — behind a load balancer
  // req.url shows the internal container address (e.g. 0.0.0.0:8080).
  const origin = (process.env.ADMIN_BASE_URL ?? new URL(req.url).origin).replace(/\/$/, "");
  const setPasswordUrl = `${origin}/set-password?token=${encodeURIComponent(rawToken)}`;

  return NextResponse.json(
    {
      ok: true,
      userId,
      email: lowered,
      setPasswordUrl,
      expiresAt: new Date(expiresAt).toISOString(),
    },
    { status: 201 },
  );
});
