// V0.8 · Approvals · decision endpoint (approve / reject / withdraw / execute)
//
// State machine:
//   pending → approved (decision="approve")
//   pending → rejected (decision="reject")
//   pending → withdrawn (decision="withdraw" — only by requester)
//   approved → executed (decision="execute" — fires the actual side effect,
//             today: publish a new revision)
//
// Self-approval permitted in V0.8 dev. V0.9 (with IAS users) will enforce
// requester ≠ approver.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "../../../../../lib/auth/guard";
import { getSqlite } from "../../../../../lib/db/client";
import { writeAudit } from "../../../../../lib/audit";
import { buildBundleFromDb } from "../../../../../lib/bundle";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({
  decision: z.enum(["approve", "reject", "withdraw", "execute"]),
  notes: z.string().trim().min(5, "Notes required (min 5 chars)").max(500),
});

export const PATCH = withSuperAdmin(async (req, ctx) => {
  const { id } = (ctx as any).params ?? { id: "" };
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { decision, notes } = parsed.data;

  const db = getSqlite();
  const row = db.prepare(`SELECT * FROM approval WHERE id = ?`).get(id) as any;
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const now = Date.now();

  // ── Transitions ────────────────────────────────────────────────────
  if (decision === "withdraw") {
    if (row.state !== "pending") return NextResponse.json({ error: "invalid_state", message: `Cannot withdraw from ${row.state}` }, { status: 409 });
    if (row.requester_id !== ctx.user.id) return NextResponse.json({ error: "forbidden", message: "Only the requester may withdraw" }, { status: 403 });
    db.prepare(`UPDATE approval SET state='withdrawn', state_notes=?, decided_at=? WHERE id=?`).run(notes, now, id);
    writeAudit({ actorUserId: ctx.user.id, action: "approval.withdrawn", entityType: "approval", entityId: id, before: { state: row.state }, after: { state: "withdrawn", notes } });
    return NextResponse.json({ ok: true, state: "withdrawn" });
  }

  if (decision === "approve" || decision === "reject") {
    if (row.state !== "pending") return NextResponse.json({ error: "invalid_state", message: `Cannot decide from ${row.state}` }, { status: 409 });
    const nextState = decision === "approve" ? "approved" : "rejected";
    db.prepare(`UPDATE approval SET state=?, state_notes=?, approver_id=?, decided_at=? WHERE id=?`)
      .run(nextState, notes, ctx.user.id, now, id);
    writeAudit({
      actorUserId: ctx.user.id,
      action: decision === "approve" ? "approval.approved" : "approval.rejected",
      entityType: "approval",
      entityId: id,
      before: { state: row.state },
      after: { state: nextState, notes },
    });
    return NextResponse.json({ ok: true, state: nextState });
  }

  if (decision === "execute") {
    if (row.state !== "approved") return NextResponse.json({ error: "invalid_state", message: `Only 'approved' approvals can be executed; got ${row.state}` }, { status: 409 });

    // V0.8 · only publish-kind approvals execute today.
    if (row.kind !== "publish") {
      // Mark executed for governance hygiene but don't side-effect.
      db.prepare(`UPDATE approval SET state='executed', state_notes=?, executed_at=? WHERE id=?`).run(notes, now, id);
      writeAudit({ actorUserId: ctx.user.id, action: "approval.executed", entityType: "approval", entityId: id, after: { state: "executed", side_effect: "noop", notes } });
      return NextResponse.json({ ok: true, state: "executed", sideEffect: "noop", message: `Approval marked executed; ${row.kind} side-effect is V0.9 scope` });
    }

    // Execute publish: same atomic txn as POST /api/admin/publish.
    const bundle = buildBundleFromDb();
    let newRevision = 1;
    let prevRevision: number | null = null;
    const txn = db.transaction(() => {
      const max = db.prepare(`SELECT COALESCE(MAX(revision_number), 0) AS n FROM config_revision`).get() as any;
      newRevision = (max.n ?? 0) + 1;
      const cur = db.prepare(`SELECT revision_number FROM config_revision WHERE is_current = 1`).get() as any;
      prevRevision = cur?.revision_number ?? null;
      db.prepare(`UPDATE config_revision SET is_current = 0 WHERE is_current = 1`).run();
      db.prepare(`INSERT INTO config_revision (id, revision_number, bundle_json, published_at, published_by, notes, is_current) VALUES (?, ?, ?, ?, ?, ?, 1)`)
        .run(randomUUID(), newRevision, JSON.stringify(bundle), now, ctx.user.id, `Via approval ${id} · ${notes}`);
      db.prepare(`UPDATE approval SET state='executed', state_notes=?, executed_at=? WHERE id=?`).run(notes, now, id);
    });
    txn();

    writeAudit({
      actorUserId: ctx.user.id,
      action: "publish",
      entityType: "config_revision",
      entityId: String(newRevision),
      before: prevRevision ? { revisionNumber: prevRevision } : null,
      after: { revisionNumber: newRevision, viaApproval: id, notes },
    });
    writeAudit({
      actorUserId: ctx.user.id,
      action: "approval.executed",
      entityType: "approval",
      entityId: id,
      after: { state: "executed", side_effect: "publish", revisionNumber: newRevision, notes },
    });

    // Fire portal revalidate.
    const portalBase = process.env.PORTAL_BASE_URL;
    const secret = process.env.REVALIDATE_SECRET;
    if (portalBase && secret) {
      fetch(`${portalBase}/api/revalidate?tag=suite-config&secret=${encodeURIComponent(secret)}`, { method: "POST" }).catch(() => {});
    }

    return NextResponse.json({ ok: true, state: "executed", revisionNumber: newRevision });
  }

  return NextResponse.json({ error: "bad_request" }, { status: 400 });
});
