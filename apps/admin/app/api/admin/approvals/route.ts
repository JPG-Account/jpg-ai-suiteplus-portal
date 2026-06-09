// V0.8 · Approvals · queue + create
//
// In V0.8 dev with a single Super Admin (JP), self-approval is permitted —
// the value here is the QUEUE, STATE MACHINE, JUSTIFICATION CAPTURE, and AUDIT
// TRAIL. Strict two-actor enforcement lands in V0.9 once IAS introduces a
// second human.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getSqlite } from "../../../../lib/db/client";
import { writeAudit } from "../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SLA_HOURS_BY_KIND: Record<string, number> = {
  publish: 4,
  role_grant: 4,
  integration: 24,
  secret_rotation: 8,
};

function mapRow(r: any) {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    detail: r.detail,
    justification: r.justification,
    payload: r.payload_json ? JSON.parse(r.payload_json) : {},
    requester: { id: r.requester_id, email: r.requester_email, name: r.requester_name },
    approver: r.approver_id ? { id: r.approver_id, email: r.approver_email, name: r.approver_name } : null,
    state: r.state,
    stateNotes: r.state_notes,
    slaDueAt: r.sla_due_at ? new Date(r.sla_due_at).toISOString() : null,
    createdAt: new Date(r.created_at).toISOString(),
    decidedAt: r.decided_at ? new Date(r.decided_at).toISOString() : null,
    executedAt: r.executed_at ? new Date(r.executed_at).toISOString() : null,
  };
}

export const GET = withSuperAdmin(async (req) => {
  const stateFilter = new URL(req.url).searchParams.get("state");
  const where = stateFilter ? `WHERE a.state = ?` : "";
  const params = stateFilter ? [stateFilter] : [];
  const rows = getSqlite().prepare(`
    SELECT a.*,
           ru.email AS requester_email, ru.display_name AS requester_name,
           au.email AS approver_email,  au.display_name AS approver_name
    FROM approval a
    LEFT JOIN user_account ru ON ru.id = a.requester_id
    LEFT JOIN user_account au ON au.id = a.approver_id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT 200
  `).all(...params) as any[];

  return NextResponse.json({ approvals: rows.map(mapRow) });
});

const CreateBody = z.object({
  kind: z.enum(["publish", "role_grant", "integration", "secret_rotation"]),
  title: z.string().min(3).max(200),
  detail: z.string().max(2000).optional(),
  justification: z.string().trim().min(10, "Justification required (min 10 chars)").max(2000),
  payload: z.record(z.any()).optional(),
});

export const POST = withSuperAdmin(async (req, ctx) => {
  const body = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { kind, title, detail, justification, payload } = parsed.data;

  const id = `apv_${randomUUID()}`;
  const now = Date.now();
  const sla = now + (SLA_HOURS_BY_KIND[kind] ?? 24) * 60 * 60 * 1000;

  const db = getSqlite();
  db.prepare(`
    INSERT INTO approval (id, kind, title, detail, justification, payload_json, requester_id, state, sla_due_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(id, kind, title, detail ?? null, justification, JSON.stringify(payload ?? {}), ctx.user.id, sla, now);

  const created = db.prepare(`
    SELECT a.*,
           ru.email AS requester_email, ru.display_name AS requester_name,
           au.email AS approver_email,  au.display_name AS approver_name
    FROM approval a
    LEFT JOIN user_account ru ON ru.id = a.requester_id
    LEFT JOIN user_account au ON au.id = a.approver_id
    WHERE a.id = ?
  `).get(id) as any;

  writeAudit({
    actorUserId: ctx.user.id,
    action: "approval.requested",
    entityType: "approval",
    entityId: id,
    after: { kind, title, justification },
  });

  return NextResponse.json({ ok: true, approval: mapRow(created) }, { status: 201 });
});
