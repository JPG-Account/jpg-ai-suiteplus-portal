import { NextRequest, NextResponse } from "next/server";
import { getAuthProvider } from "../../../../lib/auth/factory";
import { setSessionCookie } from "../../../../lib/auth/session";
import { writeAudit } from "../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const email = String(body?.email ?? "");
  const password = body?.password != null ? String(body.password) : undefined;
  const totpCode = body?.totpCode != null ? String(body.totpCode) : undefined;

  const provider = getAuthProvider();
  const input = password
    ? ({ kind: "password" as const, email, password, totpCode })
    : ({ kind: "email-only" as const, email });
  const result = await provider.signIn(input);

  if (!result.ok) {
    writeAudit({
      actorUserId: null,
      action: result.reason === "totp_required" || result.reason === "totp_invalid"
        ? "auth.totp.failed"
        : "auth.sign_in_failed",
      entityType: "auth",
      after: { email, reason: result.reason, provider: provider.kind },
    });
    const status =
      result.reason === "invalid_email" || result.reason === "password_policy" ? 400
      : result.reason === "locked" ? 423
      : result.reason === "totp_required" ? 401 // UI prompts second factor
      : 401;
    return NextResponse.json({ error: result.reason }, { status });
  }

  setSessionCookie(result.sessionToken);
  writeAudit({
    actorUserId: result.user.id,
    action: "auth.sign_in",
    entityType: "auth",
    after: { email: result.user.email, provider: provider.kind },
  });

  return NextResponse.json({ ok: true, user: result.user });
}
