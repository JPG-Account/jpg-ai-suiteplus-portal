// Public-ish draft endpoint — returns the current draft bundle for the portal
// to render inside the Composer iframe. Gated by REVALIDATE_SECRET shared
// between admin and portal (already used by the publish webhook).
// Listing as "preview" makes intent clear; same secret can be rotated together.
import { NextRequest, NextResponse } from "next/server";
import { buildBundleFromDb } from "../../../../lib/bundle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const expected = process.env.REVALIDATE_SECRET ?? "";
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const draftBundle = buildBundleFromDb();
  return NextResponse.json({
    revision: 0, // draft has no revision number
    publishedAt: new Date().toISOString(),
    bundle: draftBundle,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
