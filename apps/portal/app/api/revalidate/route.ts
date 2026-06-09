// Portal-side webhook: admin calls this after publish so the portal picks up
// the new revision immediately (instead of waiting up to 60s for ISR).
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const tag = url.searchParams.get("tag") ?? "suite-config";
  const secret = url.searchParams.get("secret");
  const expected = process.env.REVALIDATE_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  revalidateTag(tag);
  return NextResponse.json({ ok: true, tag, ts: new Date().toISOString() });
}

// Allow GET for human/admin sanity checks (just confirms the secret works).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, message: "POST to this endpoint to revalidate" });
}
