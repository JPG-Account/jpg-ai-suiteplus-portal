import { NextResponse } from "next/server";
import { withSuperAdmin } from "../../../../../lib/auth/guard";
import { buildBundleFromDb, getCurrentRevision } from "../../../../../lib/bundle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async () => {
  const draftBundle = await buildBundleFromDb();
  const current = await getCurrentRevision();
  return NextResponse.json({
    draftBundle,
    currentRevision: current?.revisionNumber ?? null,
    currentBundle: current?.bundle ?? null,
  });
});
