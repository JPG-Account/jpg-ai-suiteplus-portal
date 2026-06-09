import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthProvider } from "../../../../lib/auth/dev-email-provider";
import { SESSION_COOKIE, clearSessionCookie } from "../../../../lib/auth/session";
import { writeAudit } from "../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  await getAuthProvider().signOut(token);
  clearSessionCookie();
  writeAudit({ actorUserId: null, action: "auth.sign_out", entityType: "auth" });
  return NextResponse.json({ ok: true });
}
