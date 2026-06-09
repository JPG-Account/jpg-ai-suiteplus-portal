import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "../../../../lib/auth/cookie-name";
import { getCurrentUser } from "../../../../lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const hasCookie = !!cookies().get(SESSION_COOKIE)?.value;
  const user = await getCurrentUser();
  if (!user) {
    // V0.8 fix · distinguish "session expired" (cookie present but session row
    // gone) from "never signed in" (no cookie at all). UI can prompt re-sign-in
    // differently for the two cases.
    return NextResponse.json(
      { error: hasCookie ? "session_expired" : "unauthenticated" },
      { status: 401 },
    );
  }
  return NextResponse.json({ user });
}
