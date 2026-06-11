// Build a config bundle from current DB state (Postgres) — used by
// /api/admin/draft/preview and the publish flow. Keep this in sync with
// the seed's buildBundle() in ensure-db.ts.
import { getPool } from "./db/client";

function safeJson(s: string | null | undefined) {
  try {
    return JSON.parse(s ?? "{}");
  } catch {
    return {};
  }
}

export type ConfigBundle = {
  lanes: { id: string; name: string; audience: string; purpose: string; tags: string[] }[];
  solutions: {
    id: string;
    name: string;
    shortName?: string;
    type: string;
    status: string;
    primaryLane: string;
    secondaryLanes: string[];
    description: string;
    features: string[];
    searchKeywords: string;
    enabled: boolean;
    route: string | null;
    routeKind: "internal" | "external" | "soon";
  }[];
  blocks: {
    id: string;
    type: string;
    label: string;
    subtitle: string | null;
    position: number;
    fields: unknown;
    style: unknown;
    htmlPayload: string | null;
    enabled: boolean;
  }[];
  snippets: {
    key: string;
    type: string;
    name: string;
    description: string | null;
    variant: string;
    bodyMd: string;
  }[];
  redirects: { fromPath: string; toPath: string; statusCode: number }[];
  seo: {
    titleTemplate: string;
    description: string;
    canonicalHost: string;
    ogPayload: unknown;
  };
};

export async function buildBundleFromDb(): Promise<ConfigBundle> {
  const pool = await getPool();

  const lanesRows = (
    await pool.query(
      "SELECT * FROM lane WHERE is_archived = FALSE ORDER BY sort_order",
    )
  ).rows;
  const laneById = new Map(lanesRows.map((l: any) => [l.id, l]));

  const capRows = (
    await pool.query(
      "SELECT * FROM capability WHERE enabled = TRUE ORDER BY sort_order",
    )
  ).rows;
  const tileRows = (await pool.query("SELECT * FROM tile")).rows;
  const tileByCap = new Map(tileRows.map((t: any) => [t.capability_id, t]));

  const lanes = lanesRows.map((l: any) => ({
    id: l.slug,
    name: l.name,
    audience: l.audience,
    purpose: l.purpose,
    tags: JSON.parse(l.tags_json),
  }));

  const solutions = capRows.map((c: any) => {
    const tile = tileByCap.get(c.id) as any;
    const routeKind = (tile?.route_kind ?? "internal") as "internal" | "external" | "soon";
    // external → the validated external_url; soon → no destination;
    // internal → route_template (registry-resolved path)
    const route =
      routeKind === "external" ? (tile?.external_url ?? null)
      : routeKind === "soon" ? null
      : (tile?.route_template ?? `/capabilities/${c.slug}`);
    return {
      id: c.slug,
      name: c.name,
      shortName: c.short_name ?? undefined,
      type: c.type,
      status: c.status,
      primaryLane: (laneById.get(c.primary_lane_id) as any)?.name ?? "",
      secondaryLanes: (JSON.parse(c.secondary_lane_ids_json) as string[])
        .map((id) => (laneById.get(id) as any)?.name)
        .filter(Boolean) as string[],
      description: c.description,
      features: JSON.parse(c.features_json),
      searchKeywords: c.search_keywords,
      enabled: !!c.enabled,
      route,
      routeKind,
    };
  });

  const blockRows = (
    await pool.query(
      "SELECT * FROM page_block WHERE page_key = 'home' ORDER BY position",
    )
  ).rows;
  const blocks = blockRows.map((b: any) => ({
    id: b.id,
    type: b.block_type,
    label: b.label,
    subtitle: b.subtitle,
    position: b.position,
    fields: safeJson(b.fields_json),
    style: safeJson(b.style_json),
    htmlPayload: b.html_payload ?? null,
    enabled: !!b.is_enabled,
  }));

  const snippetRows = (
    await pool.query("SELECT * FROM snippet ORDER BY key")
  ).rows;
  const snippets = snippetRows.map((s: any) => ({
    key: s.key,
    type: s.type,
    name: s.name,
    description: s.description,
    variant: s.variant,
    bodyMd: s.body_md,
  }));

  const redirectRows = (
    await pool.query(
      "SELECT * FROM redirect WHERE is_enabled = TRUE ORDER BY from_path",
    )
  ).rows;
  const redirects = redirectRows.map((r: any) => ({
    fromPath: r.from_path,
    toPath: r.to_path,
    statusCode: r.status_code,
  }));

  const seoRows = (
    await pool.query("SELECT * FROM seo_default WHERE scope = 'global'")
  ).rows;
  const seoRow = seoRows[0] as any | undefined;
  const seo = {
    titleTemplate: seoRow?.title_template ?? "{page}",
    description: seoRow?.description ?? "",
    canonicalHost: seoRow?.canonical_host ?? "",
    ogPayload: seoRow ? JSON.parse(seoRow.og_payload_json) : {},
  };

  return { lanes, solutions, blocks, snippets, redirects, seo };
}

export async function getCurrentRevision(): Promise<
  { revisionNumber: number; bundle: ConfigBundle; publishedAt: number } | null
> {
  const pool = await getPool();
  const res = await pool.query(
    "SELECT * FROM config_revision WHERE is_current = TRUE LIMIT 1",
  );
  const row = res.rows[0] as any | undefined;
  if (!row) return null;
  return {
    revisionNumber: row.revision_number,
    bundle: JSON.parse(row.bundle_json),
    publishedAt: Number(row.published_at),
  };
}
