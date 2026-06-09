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
import { NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "../../../../../lib/auth/guard";
import { getPool } from "../../../../../lib/db/client";
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
    return NextResponse.json(
      { error: "bad_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { decision, notes } = parsed.data;

  const pool = await getPool();
  const { rows: approvalRows } = await pool.query<any>(
    "SELECT * FROM approval WHERE id = $1",
    [id],
  );
  const row = approvalRows[0];
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const now = Date.now();

  // ── Transitions ────────────────────────────────────────────────────
  if (decision === "withdraw") {
    if (row.state !== "pending") {
      return NextResponse.json(
        { error: "invalid_state", message: `Cannot withdraw from ${row.state}` },
        { status: 409 },
      );
    }
    if (row.requester_id !== ctx.user.id) {
      return NextResponse.json(
        { error: "forbidden", message: "Only the requester may withdraw" },
        { status: 403 },
      );
    }
    await pool.query(
      "UPDATE approval SET state='withdrawn', state_notes=$1, decided_at=$2 WHERE id=$3",
      [notes, now, id],
    );
    await writeAudit({
      actorUserId: ctx.user.id,
      action: "approval.withdrawn",
      entityType: "approval",
      entityId: id,
      before: { state: row.state },
      after: { state: "withdrawn", notes },
    });
    return NextResponse.json({ ok: true, state: "withdrawn" });
  }

  if (decision === "approve" || decision === "reject") {
    if (row.state !== "pending") {
      return NextResponse.json(
        { error: "invalid_state", message: `Cannot decide from ${row.state}` },
        { status: 409 },
      );
    }
    const nextState = decision === "approve" ? "approved" : "rejected";
    await pool.query(
      "UPDATE approval SET state=$1, state_notes=$2, approver_id=$3, decided_at=$4 WHERE id=$5",
      [nextState, notes, ctx.user.id, now, id],
    );
    await writeAudit({
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
    if (row.state !== "approved") {
      return NextResponse.json(
        {
          error: "invalid_state",
          message: `Only 'approved' approvals can be executed; got ${row.state}`,
        },
        { status: 409 },
      );
    }

    // V0.8 · only publish-kind approvals execute today.
    if (row.kind !== "publish") {
      // Mark executed for governance hygiene but don't side-effect.
      await pool.query(
        "UPDATE approval SET state='executed', state_notes=$1, executed_at=$2 WHERE id=$3",
        [notes, now, id],
      );
      await writeAudit({
        actorUserId: ctx.user.id,
        action: "approval.executed",
        entityType: "approval",
        entityId: id,
        after: { state: "executed", side_effect: "noop", notes },
      });
      return NextResponse.json({
        ok: true,
        state: "executed",
        sideEffect: "noop",
        message: `Approval marked executed; ${row.kind} side-effect is V0.9 scope`,
      });
    }

    // Execute publish: same atomic txn as POST /api/admin/publish.
    const bundle = await buildBundleFromDb();
    let newRevision = 1;
    let prevRevision: number | null = null;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const maxRes = await client.query<any>(
        "SELECT COALESCE(MAX(revision_number), 0) AS n FROM config_revision",
      );
      newRevision = Number(maxRes.rows[0]?.n ?? 0) + 1;
      const curRes = await client.query<any>(
        "SELECT revision_number FROM config_revision WHERE is_current = TRUE",
      );
      prevRevision = curRes.rows[0]?.revision_number ?? null;
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
          now,
          ctx.user.id,
          `Via approval ${id} · ${notes}`,
        ],
      );
      await client.query(
        "UPDATE approval SET state='executed', state_notes=$1, executed_at=$2 WHERE id=$3",
        [notes, now, id],
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
      before: prevRevision ? { revisionNumber: prevRevision } : null,
      after: { revisionNumber: newRevision, viaApproval: id, notes },
    });
    await writeAudit({
      actorUserId: ctx.user.id,
      action: "approval.executed",
      entityType: "approval",
      entityId: id,
      after: {
        state: "executed",
        side_effect: "publish",
        revisionNumber: newRevision,
        notes,
      },
    });

    // Fire portal revalidate.
    const portalBase = process.env.PORTAL_BASE_URL;
    const secret = process.env.REVALIDATE_SECRET;
    if (portalBase && secret) {
      fetch(
        `${portalBase}/api/revalidate?tag=suite-config&secret=${encodeURIComponent(secret)}`,
        { method: "POST" },
      ).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      state: "executed",
      revisionNumber: newRevision,
    });
  }

  return NextResponse.json({ error: "bad_request" }, { status: 400 });
});
