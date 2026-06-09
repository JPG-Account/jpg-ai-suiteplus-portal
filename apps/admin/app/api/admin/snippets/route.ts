import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getSqlite } from "../../../../lib/db/client";
import { writeAudit } from "../../../../lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async () => {
  const rows = getSqlite().prepare(`SELECT * FROM snippet ORDER BY key`).all() as any[];
  return NextResponse.json({
    snippets: rows.map((s) => ({
      id: s.id,
      key: s.key,
      type: s.type,
      name: s.name,
      description: s.description,
      bodyMd: s.body_md,
      variant: s.variant,
      updatedAt: new Date(s.updated_at).toISOString(),
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
  if (!parsed.success) return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  const { id, ...patch } = parsed.data;

  const db = getSqlite();
  const before = db.prepare(`SELECT * FROM snippet WHERE id = ?`).get(id) as any;
  if (!before) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // V0.7.1 fix #1 — short-circuit when nothing changed (match Tile PATCH).
  // Avoids "phantom" audit rows + spurious updated_at bumps.
  const editableFields: string[] = [];
  const editableValues: any[] = [];
  if (patch.name !== undefined && patch.name !== before.name) { editableFields.push("name = ?"); editableValues.push(patch.name); }
  if (patch.description !== undefined && patch.description !== before.description) { editableFields.push("description = ?"); editableValues.push(patch.description); }
  if (patch.bodyMd !== undefined && patch.bodyMd !== before.body_md) { editableFields.push("body_md = ?"); editableValues.push(patch.bodyMd); }
  if (patch.variant !== undefined && patch.variant !== before.variant) { editableFields.push("variant = ?"); editableValues.push(patch.variant); }

  if (editableFields.length === 0) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const fields = [...editableFields, "updated_at = ?"];
  const values = [...editableValues, Date.now()];

  db.prepare(`UPDATE snippet SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
  const after = db.prepare(`SELECT * FROM snippet WHERE id = ?`).get(id);

  writeAudit({
    actorUserId: ctx.user.id,
    action: "snippet.updated",
    entityType: "snippet",
    entityId: id,
    before,
    after,
  });

  return NextResponse.json({ ok: true, snippet: after });
});
