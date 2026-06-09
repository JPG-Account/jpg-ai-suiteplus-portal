import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "../../../../../lib/auth/guard";
import { getSqlite } from "../../../../../lib/db/client";
import { writeAudit } from "../../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async () => {
  const rows = getSqlite().prepare(`SELECT * FROM auth_allowed_domain ORDER BY pattern`).all() as any[];
  return NextResponse.json({
    domains: rows.map((r) => ({
      pattern: r.pattern,
      isGlob: !!r.is_glob,
      addedBy: r.added_by,
      createdAt: new Date(r.created_at).toISOString(),
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
  if (!parsed.success) return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  const pattern = parsed.data.pattern.trim().toLowerCase();
  if (!pattern.startsWith("@")) return NextResponse.json({ error: "bad_pattern", message: "Pattern must start with @" }, { status: 400 });

  try {
    getSqlite().prepare(`INSERT INTO auth_allowed_domain (pattern, is_glob, added_by, created_at) VALUES (?, ?, ?, ?)`)
      .run(pattern, parsed.data.isGlob ? 1 : 0, ctx.user.id, Date.now());
  } catch (e: any) {
    if (String(e?.message).includes("UNIQUE")) return NextResponse.json({ error: "conflict" }, { status: 409 });
    throw e;
  }
  writeAudit({ actorUserId: ctx.user.id, action: "auth.domain.added", entityType: "auth_allowed_domain", entityId: pattern, after: { pattern, isGlob: parsed.data.isGlob } });
  return NextResponse.json({ ok: true, pattern });
});

export const DELETE = withSuperAdmin(async (req, ctx) => {
  const pattern = new URL(req.url).searchParams.get("pattern");
  if (!pattern) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const db = getSqlite();
  const before = db.prepare(`SELECT * FROM auth_allowed_domain WHERE pattern = ?`).get(pattern) as any;
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Atomic last-domain guard. Without the transaction, two parallel deletes
  // could both pass the count check and both succeed → zero rows → lockout.
  let lastDomain = false;
  const txn = db.transaction(() => {
    const remaining = (db.prepare(`SELECT COUNT(*) AS n FROM auth_allowed_domain`).get() as any).n;
    if (remaining <= 1) { lastDomain = true; return; }
    db.prepare(`DELETE FROM auth_allowed_domain WHERE pattern = ?`).run(pattern);
  });
  txn();
  if (lastDomain) return NextResponse.json({ error: "last_domain", message: "Cannot remove the last allowed domain — sign-in would lock out." }, { status: 409 });

  writeAudit({ actorUserId: ctx.user.id, action: "auth.domain.removed", entityType: "auth_allowed_domain", entityId: pattern, before });
  return NextResponse.json({ ok: true });
});
