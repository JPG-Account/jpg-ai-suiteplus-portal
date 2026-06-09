import { NextResponse } from "next/server";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getSqlite } from "../../../../lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async () => {
  const rows = getSqlite().prepare(`SELECT * FROM lane ORDER BY sort_order`).all() as any[];
  return NextResponse.json({
    lanes: rows.map((l) => ({
      id: l.id,
      slug: l.slug,
      name: l.name,
      audience: l.audience,
      purpose: l.purpose,
      tags: JSON.parse(l.tags_json),
      sortOrder: l.sort_order,
      isArchived: !!l.is_archived,
    })),
  });
});
