import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLocalPasswordProvider } from "../../../../lib/auth/local-password-provider";
import { getCurrentUser } from "../../../../lib/auth/session";
import { writeAudit } from "../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await getLocalPasswordProvider().changePassword(user.id, parsed.data.currentPassword, parsed.data.newPassword);
  if (!result.ok) {
    writeAudit({ actorUserId: user.id, action: "auth.password.change_failed", entityType: "auth", after: { reason: result.reason } });
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }
  writeAudit({ actorUserId: user.id, action: "auth.password.changed", entityType: "auth" });
  return NextResponse.json({ ok: true });
}
