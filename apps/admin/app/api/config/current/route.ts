// Portal-facing endpoint — UNAUTH. Returns the published bundle.
// ISR-friendly cache headers. Portal calls this with next: { revalidate: 60 }.
import { NextResponse } from "next/server";
import { getCurrentRevision } from "../../../../lib/bundle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const current = getCurrentRevision();
  if (!current) {
    return NextResponse.json({ error: "no_published_revision" }, { status: 503 });
  }
  const res = NextResponse.json({
    revision: current.revisionNumber,
    publishedAt: new Date(current.publishedAt).toISOString(),
    bundle: current.bundle,
  });
  res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=600");
  res.headers.set("ETag", `"rev-${current.revisionNumber}"`);
  res.headers.set("Access-Control-Allow-Origin", process.env.PORTAL_BASE_URL ?? "*");
  return res;
}
