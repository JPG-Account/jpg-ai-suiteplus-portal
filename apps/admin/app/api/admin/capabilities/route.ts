import { NextResponse } from "next/server";
import { withSuperAdmin } from "../../../../lib/auth/guard";
import { getPool } from "../../../../lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async () => {
  const pool = await getPool();
  const { rows } = await pool.query<any>(
    "SELECT * FROM capability ORDER BY sort_order",
  );
  return NextResponse.json({
    capabilities: rows.map((c: any) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      shortName: c.short_name,
      type: c.type,
      status: c.status,
      primaryLaneId: c.primary_lane_id,
      secondaryLaneIds: JSON.parse(c.secondary_lane_ids_json),
      description: c.description,
      features: JSON.parse(c.features_json),
      enabled: !!c.enabled,
      sortOrder: c.sort_order,
    })),
  });
});
