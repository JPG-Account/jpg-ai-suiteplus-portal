// /api/auth/totp · GET status · POST enroll · DELETE remove · PATCH verify-enrollment
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "../../../../lib/auth/session";
import { getPool } from "../../../../lib/db/client";
import { writeAudit } from "../../../../lib/audit";
import { generateTotpSecret, otpauthUri, totpVerify } from "../../../../lib/auth/totp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const pool = await getPool();
  const { rows } = await pool.query<{ verified: boolean }>(
    "SELECT verified FROM totp_secret WHERE user_id = $1",
    [user.id],
  );
  const row = rows[0];
  return NextResponse.json({
    enabled: !!(row && row.verified),
    provisioned: !!row,
  });
}

// Start enrollment: generates a new secret, returns it + otpauth URI.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (user.role !== "super_admin") {
    return NextResponse.json(
      { error: "forbidden", message: "TOTP is Super-Admin-only in V0.9-Crawl" },
      { status: 403 },
    );
  }

  const pool = await getPool();
  const { rows } = await pool.query<{ verified: boolean }>(
    "SELECT verified FROM totp_secret WHERE user_id = $1",
    [user.id],
  );
  if (rows[0]?.verified) {
    return NextResponse.json({ error: "already_enabled" }, { status: 409 });
  }

  const secret = generateTotpSecret();
  const now = Date.now();
  await pool.query(
    `INSERT INTO totp_secret (user_id, secret_base32, verified, created_at)
     VALUES ($1, $2, FALSE, $3)
     ON CONFLICT (user_id) DO UPDATE SET
       secret_base32 = EXCLUDED.secret_base32,
       verified = FALSE,
       created_at = EXCLUDED.created_at`,
    [user.id, secret, now],
  );
  await writeAudit({
    actorUserId: user.id,
    action: "auth.totp.enrollment_started",
    entityType: "user_account",
    entityId: user.id,
  });
  return NextResponse.json({
    ok: true,
    secret,
    uri: otpauthUri(user.email, secret),
  });
}

const VerifyBody = z.object({ code: z.string().regex(/^\d{6}$/) });

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = VerifyBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const pool = await getPool();
  const { rows } = await pool.query<{ secret_base32: string }>(
    "SELECT secret_base32 FROM totp_secret WHERE user_id = $1",
    [user.id],
  );
  const row = rows[0];
  if (!row) return NextResponse.json({ error: "no_enrollment" }, { status: 404 });

  if (!totpVerify(row.secret_base32, parsed.data.code)) {
    await writeAudit({
      actorUserId: user.id,
      action: "auth.totp.verify_failed",
      entityType: "user_account",
      entityId: user.id,
    });
    return NextResponse.json({ error: "totp_invalid" }, { status: 400 });
  }
  await pool.query("UPDATE totp_secret SET verified = TRUE WHERE user_id = $1", [user.id]);
  await writeAudit({
    actorUserId: user.id,
    action: "auth.totp.enrolled",
    entityType: "user_account",
    entityId: user.id,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const pool = await getPool();
  await pool.query("DELETE FROM totp_secret WHERE user_id = $1", [user.id]);
  await writeAudit({
    actorUserId: user.id,
    action: "auth.totp.removed",
    entityType: "user_account",
    entityId: user.id,
  });
  return NextResponse.json({ ok: true });
}
