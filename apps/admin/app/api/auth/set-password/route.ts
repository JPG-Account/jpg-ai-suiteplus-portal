import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLocalPasswordProvider } from "../../../../lib/auth/local-password-provider";
import { writeAudit } from "../../../../lib/audit";
import { setSessionCookie } from "../../../../lib/auth/session";
import { getPool } from "../../../../lib/db/client";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({
  token: z.string().min(8),
  newPassword: z.string().min(12).max(128),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const result = await getLocalPasswordProvider().setPasswordFromToken(
    parsed.data.token,
    parsed.data.newPassword,
  );
  if (!result.ok) {
    await writeAudit({
      actorUserId: null,
      action: "auth.password.set_failed",
      entityType: "auth",
      after: { reason: result.reason },
    });
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }
  await writeAudit({
    actorUserId: result.userId,
    action: "auth.password.set",
    entityType: "auth",
    entityId: result.userId,
  });

  // Auto-issue session (so user is signed in after setting password)
  const pool = await getPool();
  const token = randomUUID();
  const now = Date.now();
  const ttlH = parseInt(process.env.SESSION_TTL_HOURS ?? "8", 10);
  await pool.query(
    "INSERT INTO session (id, user_id, expires_at, created_at, last_seen_at) VALUES ($1, $2, $3, $4, $5)",
    [token, result.userId, now + ttlH * 60 * 60 * 1000, now, now],
  );
  setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
