import { NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getPool } from "../../../../lib/db/client";
import { writeAudit } from "../../../../lib/audit";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async () => {
  const pool = await getPool();
  const { rows } = await pool.query<any>(
    "SELECT * FROM redirect ORDER BY from_path",
  );
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
const StatusCode = z.union([
  z.literal(301),
  z.literal(302),
  z.literal(307),
  z.literal(308),
]);
const CreateBody = z.object({
  fromPath: z.string().min(1).startsWith("/"),
  toPath: z.string().min(1),
  statusCode: StatusCode,
});

export const POST = withSuperAdmin(async (req, ctx) => {
  const body = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const pool = await getPool();
  const id = `rdr_${randomUUID()}`;
  try {
    await pool.query(
      `INSERT INTO redirect (id, from_path, to_path, status_code, is_enabled)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [id, parsed.data.fromPath, parsed.data.toPath, parsed.data.statusCode],
    );
  } catch (e: any) {
    // Postgres unique_violation
    if (e?.code === "23505") {
      return NextResponse.json(
        { error: "conflict", message: "from_path already exists" },
        { status: 409 },
      );
    }
    throw e;
  }
  const { rows: createdRows } = await pool.query<any>(
    "SELECT * FROM redirect WHERE id = $1",
    [id],
  );
  const created = createdRows[0];

  await writeAudit({
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
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { id, ...patch } = parsed.data;

  const pool = await getPool();
  const { rows: beforeRows } = await pool.query<any>(
    "SELECT * FROM redirect WHERE id = $1",
    [id],
  );
  const before = beforeRows[0];
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const fields: string[] = [];
  const values: any[] = [];
  let pos = 1;
  const add = (col: string, val: any) => {
    fields.push(`${col} = $${pos++}`);
    values.push(val);
  };
  if (patch.fromPath !== undefined) add("from_path", patch.fromPath);
  if (patch.toPath !== undefined) add("to_path", patch.toPath);
  if (patch.statusCode !== undefined) add("status_code", patch.statusCode);
  if (patch.isEnabled !== undefined) add("is_enabled", patch.isEnabled);
  if (fields.length === 0) return NextResponse.json({ ok: true, unchanged: true });

  const sql = `UPDATE redirect SET ${fields.join(", ")} WHERE id = $${pos}`;
  values.push(id);
  await pool.query(sql, values);

  const { rows: afterRows } = await pool.query<any>(
    "SELECT * FROM redirect WHERE id = $1",
    [id],
  );
  const after = afterRows[0];

  await writeAudit({
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
  const pool = await getPool();
  const { rows: beforeRows } = await pool.query<any>(
    "SELECT * FROM redirect WHERE id = $1",
    [id],
  );
  const before = beforeRows[0];
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await pool.query("DELETE FROM redirect WHERE id = $1", [id]);
  await writeAudit({
    actorUserId: ctx.user.id,
    action: "redirect.deleted",
    entityType: "redirect",
    entityId: id,
    before,
  });
  return NextResponse.json({ ok: true });
});
