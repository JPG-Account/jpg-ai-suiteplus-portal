import { NextResponse } from "next/server";
import { getOrCreateCsrfToken } from "../../../lib/auth/csrf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Idempotent token issuer — call from any authenticated client to ensure cookie present.
export async function GET() {
  const token = getOrCreateCsrfToken();
  return NextResponse.json({ ok: true, token });
}
