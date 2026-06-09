// Atomic publish — creates a new immutable config_revision, flips is_current.
// Fires the portal revalidate webhook so the portal picks up the change immediately.
import { NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getPool } from "../../../../lib/db/client";
import { buildBundleFromDb, getCurrentRevision } from "../../../../lib/bundle";
import { writeAudit } from "../../../../lib/audit";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({
  notes: z.string().max(500).optional(),
});

export const POST = withSuperAdmin(async (req, ctx) => {
  const body = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const notes = parsed.data.notes ?? "";

  const pool = await getPool();
  const bundle = await buildBundleFromDb();
  const before = await getCurrentRevision();

  // Atomic transaction — next revision number, flip is_current.
  let newRevision: number = 1;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const maxRes = await client.query<any>(
      "SELECT COALESCE(MAX(revision_number), 0) AS n FROM config_revision",
    );
    newRevision = Number(maxRes.rows[0]?.n ?? 0) + 1;
    await client.query(
      "UPDATE config_revision SET is_current = FALSE WHERE is_current = TRUE",
    );
    await client.query(
      `INSERT INTO config_revision
        (id, revision_number, bundle_json, published_at, published_by, notes, is_current)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
      [
        randomUUID(),
        newRevision,
        JSON.stringify(bundle),
        Date.now(),
        ctx.user.id,
        notes,
      ],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  await writeAudit({
    actorUserId: ctx.user.id,
    action: "publish",
    entityType: "config_revision",
    entityId: String(newRevision),
    before: before ? { revisionNumber: before.revisionNumber } : null,
    after: { revisionNumber: newRevision, notes },
  });

  // Fire portal revalidate (don't wait).
  const portalBase = process.env.PORTAL_BASE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (portalBase && secret) {
    fetch(
      `${portalBase}/api/revalidate?tag=suite-config&secret=${encodeURIComponent(secret)}`,
      { method: "POST" },
    ).catch(() => {
      // Best-effort. Portal's ISR (60s) is the backstop.
    });
  }

  return NextResponse.json({ ok: true, revision: newRevision });
});
