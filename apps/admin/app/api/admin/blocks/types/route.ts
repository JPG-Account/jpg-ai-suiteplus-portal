import { NextResponse } from "next/server";
import { withSuperAdmin } from "../../../../../lib/auth/guard";
import { BLOCK_TYPE_REGISTRY, BLOCK_TYPES_BY_CATEGORY } from "../../../../../lib/composer/block-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withSuperAdmin(async () => {
  return NextResponse.json({
    types: Object.values(BLOCK_TYPE_REGISTRY).map((d) => ({
      type: d.type,
      category: d.category,
      displayName: d.displayName,
      description: d.description,
      contentFields: d.contentFields,
      renderMode: d.renderMode,
    })),
    byCategory: Object.fromEntries(
      Object.entries(BLOCK_TYPES_BY_CATEGORY).map(([cat, list]) => [cat, list.map((d) => d.type)]),
    ),
  });
});
