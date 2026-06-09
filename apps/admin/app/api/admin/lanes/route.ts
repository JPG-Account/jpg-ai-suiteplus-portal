import { NextResponse } from "next/server";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getPool } from "../../../../lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async () => {
  const pool = await getPool();
  const { rows } = await pool.query<any>("SELECT * FROM lane ORDER BY sort_order");
  return NextResponse.json({
    lanes: rows.map((l: any) => ({
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
