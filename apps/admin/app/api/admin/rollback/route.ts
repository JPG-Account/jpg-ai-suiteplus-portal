// Rollback — flip is_current to a prior revision. The target revision row stays
// immutable; we just point at it. Atomically transacted (incl. the "what was
// current" read for audit lineage), audited, fires portal revalidate webhook.
import { NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getSqlite } from "../../../../lib/db/client";
import { writeAudit } from "../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V0.7.1 fix #4 — notes is REQUIRED (min 5 chars). Every rollback must carry a
// reason so future incident reviews have one less question to ask.
const Body = z.object({
  revisionNumber: z.number().int().positive(),
  notes: z.string().trim().min(5, "Notes required (min 5 chars)").max(500),
});

export const POST = withSuperAdmin(async (req, ctx) => {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { revisionNumber, notes } = parsed.data;

  const db = getSqlite();
  const target = db.prepare(`SELECT * FROM config_revision WHERE revision_number = ?`).get(revisionNumber) as any;
  if (!target) {
    return NextResponse.json({ error: "not_found", message: "Revision does not exist" }, { status: 404 });
  }
  if (target.is_current) {
    return NextResponse.json({ error: "noop", message: "Revision is already current" }, { status: 409 });
  }

  // V0.7.1 fix #3 — read `current` INSIDE the transaction so audit lineage
  // (rolledBackFrom + before_json) is accurate under concurrent rollback calls.
  let rolledBackFrom: number | null = null;
  const txn = db.transaction(() => {
    const cur = db.prepare(`SELECT revision_number FROM config_revision WHERE is_current = 1`).get() as any;
    rolledBackFrom = cur?.revision_number ?? null;
    db.prepare(`UPDATE config_revision SET is_current = 0 WHERE is_current = 1`).run();
    db.prepare(`UPDATE config_revision SET is_current = 1 WHERE revision_number = ?`).run(revisionNumber);
  });
  txn();

  writeAudit({
    actorUserId: ctx.user.id,
    action: "rollback",
    entityType: "config_revision",
    entityId: String(revisionNumber),
    before: rolledBackFrom != null ? { revisionNumber: rolledBackFrom } : null,
    after: { revisionNumber, notes },
  });

  // Fire portal revalidate (best-effort).
  const portalBase = process.env.PORTAL_BASE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (portalBase && secret) {
    fetch(`${portalBase}/api/revalidate?tag=suite-config&secret=${encodeURIComponent(secret)}`, { method: "POST" }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    rolledBackFrom,
    rolledBackTo: revisionNumber,
    notes,
  });
});
