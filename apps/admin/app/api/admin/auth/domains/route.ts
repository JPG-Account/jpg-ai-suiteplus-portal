import { NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "../../../../../lib/auth/guard";
import { getPool } from "../../../../../lib/db/client";
import { writeAudit } from "../../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async () => {
  const pool = await getPool();
  const { rows } = await pool.query<any>(
    "SELECT * FROM auth_allowed_domain ORDER BY pattern",
  );
  return NextResponse.json({
    domains: rows.map((r: any) => ({
      pattern: r.pattern,
      isGlob: !!r.is_glob,
      addedBy: r.added_by,
      createdAt: new Date(Number(r.created_at)).toISOString(),
    })),
  });
});

const CreateBody = z.object({
  pattern: z.string().min(2).max(120),
  isGlob: z.boolean().default(false),
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
  const pattern = parsed.data.pattern.trim().toLowerCase();
  if (!pattern.startsWith("@")) {
    return NextResponse.json(
      { error: "bad_pattern", message: "Pattern must start with @" },
      { status: 400 },
    );
  }

  try {
    const pool = await getPool();
    await pool.query(
      "INSERT INTO auth_allowed_domain (pattern, is_glob, added_by, created_at) VALUES ($1, $2, $3, $4)",
      [pattern, parsed.data.isGlob, ctx.user.id, Date.now()],
    );
  } catch (e: any) {
    // Postgres unique_violation = 23505
    if (e?.code === "23505") {
      return NextResponse.json({ error: "conflict" }, { status: 409 });
    }
    throw e;
  }
  await writeAudit({
    actorUserId: ctx.user.id,
    action: "auth.domain.added",
    entityType: "auth_allowed_domain",
    entityId: pattern,
    after: { pattern, isGlob: parsed.data.isGlob },
  });
  return NextResponse.json({ ok: true, pattern });
});

export const DELETE = withSuperAdmin(async (req, ctx) => {
  const pattern = new URL(req.url).searchParams.get("pattern");
  if (!pattern) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const pool = await getPool();
  const { rows: beforeRows } = await pool.query<any>(
    "SELECT * FROM auth_allowed_domain WHERE pattern = $1",
    [pattern],
  );
  const before = beforeRows[0];
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Atomic last-domain guard. Without the transaction, two parallel deletes
  // could both pass the count check and both succeed → zero rows → lockout.
  let lastDomain = false;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const countRes = await client.query<{ n: string }>(
      "SELECT COUNT(*)::text AS n FROM auth_allowed_domain",
    );
    const remaining = Number(countRes.rows[0]?.n ?? 0);
    if (remaining <= 1) {
      lastDomain = true;
    } else {
      await client.query("DELETE FROM auth_allowed_domain WHERE pattern = $1", [pattern]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  if (lastDomain) {
    return NextResponse.json(
      {
        error: "last_domain",
        message: "Cannot remove the last allowed domain — sign-in would lock out.",
      },
      { status: 409 },
    );
  }

  await writeAudit({
    actorUserId: ctx.user.id,
    action: "auth.domain.removed",
    entityType: "auth_allowed_domain",
    entityId: pattern,
    before,
  });
  return NextResponse.json({ ok: true });
});
