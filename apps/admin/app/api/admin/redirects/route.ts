import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getSqlite } from "../../../../lib/db/client";
import { writeAudit } from "../../../../lib/audit";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async () => {
  const rows = getSqlite().prepare(`SELECT * FROM redirect ORDER BY from_path`).all() as any[];
  return NextResponse.json({
    redirects: rows.map((r) => ({
      id: r.id,
      fromPath: r.from_path,
      toPath: r.to_path,
      statusCode: r.status_code,
      isEnabled: !!r.is_enabled,
    })),
  });
});

// V0.8 · accept 307 (temporary, preserve method) + 308 (permanent, preserve method)
const StatusCode = z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]);
const CreateBody = z.object({
  fromPath: z.string().min(1).startsWith("/"),
  toPath: z.string().min(1),
  statusCode: StatusCode,
});

export const POST = withSuperAdmin(async (req, ctx) => {
  const body = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });

  const db = getSqlite();
  const id = `rdr_${randomUUID()}`;
  try {
    db.prepare(`INSERT INTO redirect (id, from_path, to_path, status_code, is_enabled) VALUES (?, ?, ?, ?, 1)`)
      .run(id, parsed.data.fromPath, parsed.data.toPath, parsed.data.statusCode);
  } catch (e: any) {
    if (String(e?.message).includes("UNIQUE")) {
      return NextResponse.json({ error: "conflict", message: "from_path already exists" }, { status: 409 });
    }
    throw e;
  }
  const created = db.prepare(`SELECT * FROM redirect WHERE id = ?`).get(id);

  writeAudit({
    actorUserId: ctx.user.id,
    action: "redirect.created",
    entityType: "redirect",
    entityId: id,
    after: created,
  });

  return NextResponse.json({ ok: true, redirect: created }, { status: 201 });
});

const PatchBody = z.object({
  id: z.string(),
  fromPath: z.string().min(1).startsWith("/").optional(),
  toPath: z.string().min(1).optional(),
  statusCode: StatusCode.optional(),
  isEnabled: z.boolean().optional(),
});

export const PATCH = withSuperAdmin(async (req, ctx) => {
  const body = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  const { id, ...patch } = parsed.data;

  const db = getSqlite();
  const before = db.prepare(`SELECT * FROM redirect WHERE id = ?`).get(id) as any;
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const fields: string[] = [];
  const values: any[] = [];
  if (patch.fromPath !== undefined) { fields.push("from_path = ?"); values.push(patch.fromPath); }
  if (patch.toPath !== undefined) { fields.push("to_path = ?"); values.push(patch.toPath); }
  if (patch.statusCode !== undefined) { fields.push("status_code = ?"); values.push(patch.statusCode); }
  if (patch.isEnabled !== undefined) { fields.push("is_enabled = ?"); values.push(patch.isEnabled ? 1 : 0); }
  if (fields.length === 0) return NextResponse.json({ ok: true, unchanged: true });

  db.prepare(`UPDATE redirect SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
  const after = db.prepare(`SELECT * FROM redirect WHERE id = ?`).get(id);

  writeAudit({
    actorUserId: ctx.user.id,
    action: "redirect.updated",
    entityType: "redirect",
    entityId: id,
    before,
    after,
  });

  return NextResponse.json({ ok: true, redirect: after });
});

export const DELETE = withSuperAdmin(async (req, ctx) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const db = getSqlite();
  const before = db.prepare(`SELECT * FROM redirect WHERE id = ?`).get(id) as any;
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });
  db.prepare(`DELETE FROM redirect WHERE id = ?`).run(id);
  writeAudit({
    actorUserId: ctx.user.id,
    action: "redirect.deleted",
    entityType: "redirect",
    entityId: id,
    before,
  });
  return NextResponse.json({ ok: true });
});
