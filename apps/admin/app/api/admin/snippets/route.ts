import { NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getPool } from "../../../../lib/db/client";
import { writeAudit } from "../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async () => {
  const pool = await getPool();
  const { rows } = await pool.query<any>("SELECT * FROM snippet ORDER BY key");
  return NextResponse.json({
    snippets: rows.map((s) => ({
      id: s.id,
      key: s.key,
      type: s.type,
      name: s.name,
      description: s.description,
      bodyMd: s.body_md,
      variant: s.variant,
      updatedAt: new Date(Number(s.updated_at)).toISOString(),
    })),
  });
});

const PatchBody = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  bodyMd: z.string().optional(),
  variant: z.enum(["light", "dark"]).optional(),
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
    "SELECT * FROM snippet WHERE id = $1",
    [id],
  );
  const before = beforeRows[0];
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // V0.7.1 fix #1 — short-circuit when nothing changed (match Tile PATCH).
  // Avoids "phantom" audit rows + spurious updated_at bumps.
  const editableFields: string[] = [];
  const editableValues: any[] = [];
  let pos = 1;
  const add = (col: string, val: any) => {
    editableFields.push(`${col} = $${pos++}`);
    editableValues.push(val);
  };
  if (patch.name !== undefined && patch.name !== before.name) add("name", patch.name);
  if (patch.description !== undefined && patch.description !== before.description) add("description", patch.description);
  if (patch.bodyMd !== undefined && patch.bodyMd !== before.body_md) add("body_md", patch.bodyMd);
  if (patch.variant !== undefined && patch.variant !== before.variant) add("variant", patch.variant);

  if (editableFields.length === 0) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  add("updated_at", Date.now());
  const sql = `UPDATE snippet SET ${editableFields.join(", ")} WHERE id = $${pos}`;
  editableValues.push(id);
  await pool.query(sql, editableValues);

  const { rows: afterRows } = await pool.query<any>(
    "SELECT * FROM snippet WHERE id = $1",
    [id],
  );
  const after = afterRows[0];

  await writeAudit({
    actorUserId: ctx.user.id,
    action: "snippet.updated",
    entityType: "snippet",
    entityId: id,
    before,
    after,
  });

  return NextResponse.json({ ok: true, snippet: after });
});
