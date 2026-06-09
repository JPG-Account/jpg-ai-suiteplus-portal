// /api/auth/totp · GET status · POST enroll · DELETE remove · PATCH verify-enrollment
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "../../../../lib/auth/session";
import { getSqlite } from "../../../../lib/db/client";
import { writeAudit } from "../../../../lib/audit";
import { generateTotpSecret, otpauthUri, totpVerify } from "../../../../lib/auth/totp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const row = getSqlite().prepare(`SELECT verified FROM totp_secret WHERE user_id = ?`).get(user.id) as any;
  return NextResponse.json({ enabled: !!(row && row.verified), provisioned: !!row });
}

// Start enrollment: generates a new secret, returns it + otpauth URI.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (user.role !== "super_admin") return NextResponse.json({ error: "forbidden", message: "TOTP is Super-Admin-only in V0.9-Crawl" }, { status: 403 });

  const db = getSqlite();
  const existing = db.prepare(`SELECT * FROM totp_secret WHERE user_id = ?`).get(user.id) as any;
  if (existing?.verified) return NextResponse.json({ error: "already_enabled" }, { status: 409 });

  const secret = generateTotpSecret();
  const now = Date.now();
  db.prepare(`INSERT OR REPLACE INTO totp_secret (user_id, secret_base32, verified, created_at) VALUES (?, ?, 0, ?)`)
    .run(user.id, secret, now);
  writeAudit({ actorUserId: user.id, action: "auth.totp.enrollment_started", entityType: "user_account", entityId: user.id });
  return NextResponse.json({ ok: true, secret, uri: otpauthUri(user.email, secret) });
}

const VerifyBody = z.object({ code: z.string().regex(/^\d{6}$/) });

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = VerifyBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = getSqlite();
  const row = db.prepare(`SELECT * FROM totp_secret WHERE user_id = ?`).get(user.id) as any;
  if (!row) return NextResponse.json({ error: "no_enrollment" }, { status: 404 });

  if (!totpVerify(row.secret_base32, parsed.data.code)) {
    writeAudit({ actorUserId: user.id, action: "auth.totp.verify_failed", entityType: "user_account", entityId: user.id });
    return NextResponse.json({ error: "totp_invalid" }, { status: 400 });
  }
  db.prepare(`UPDATE totp_secret SET verified = 1 WHERE user_id = ?`).run(user.id);
  writeAudit({ actorUserId: user.id, action: "auth.totp.enrolled", entityType: "user_account", entityId: user.id });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  getSqlite().prepare(`DELETE FROM totp_secret WHERE user_id = ?`).run(user.id);
  writeAudit({ actorUserId: user.id, action: "auth.totp.removed", entityType: "user_account", entityId: user.id });
  return NextResponse.json({ ok: true });
}
