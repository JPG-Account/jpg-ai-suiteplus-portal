// Build a config bundle from current DB state — used by /api/admin/draft/preview
// and the publish flow. Keep this in sync with the seed's buildBundle().
import { getSqlite } from "./db/client";

function safeJson(s: string | null | undefined) { try { return JSON.parse(s ?? "{}"); } catch { return {}; } }

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
    route: string;
  }[];
  blocks: { id: string; type: string; label: string; subtitle: string | null; position: number; fields: unknown; style: unknown; htmlPayload: string | null; enabled: boolean }[];
  snippets: { key: string; type: string; name: string; description: string | null; variant: string; bodyMd: string }[];
  redirects: { fromPath: string; toPath: string; statusCode: number }[];
  seo: { titleTemplate: string; description: string; canonicalHost: string; ogPayload: unknown };
};

export function buildBundleFromDb(): ConfigBundle {
  const db = getSqlite();

  const lanesRows = db.prepare(`SELECT * FROM lane WHERE is_archived = 0 ORDER BY sort_order`).all() as any[];
  const laneById = new Map(lanesRows.map((l) => [l.id, l]));

  const capRows = db.prepare(`SELECT * FROM capability WHERE enabled = 1 ORDER BY sort_order`).all() as any[];
  const tileRows = db.prepare(`SELECT * FROM tile`).all() as any[];
  const tileByCap = new Map(tileRows.map((t) => [t.capability_id, t]));

  const lanes = lanesRows.map((l) => ({
    id: l.slug,
    name: l.name,
    audience: l.audience,
    purpose: l.purpose,
    tags: JSON.parse(l.tags_json),
  }));

  const solutions = capRows.map((c) => {
    const tile = tileByCap.get(c.id);
    return {
      id: c.slug,
      name: c.name,
      shortName: c.short_name ?? undefined,
      type: c.type,
      status: c.status,
      primaryLane: laneById.get(c.primary_lane_id)?.name ?? "",
      secondaryLanes: (JSON.parse(c.secondary_lane_ids_json) as string[]).map((id) => laneById.get(id)?.name).filter(Boolean) as string[],
      description: c.description,
      features: JSON.parse(c.features_json),
      searchKeywords: c.search_keywords,
      enabled: !!c.enabled,
      route: tile?.route_template ?? `/capabilities/${c.slug}`,
    };
  });

  const blockRows = db.prepare(`SELECT * FROM page_block WHERE page_key = 'home' ORDER BY position`).all() as any[];
  const blocks = blockRows.map((b) => ({
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

  const snippetRows = db.prepare(`SELECT * FROM snippet ORDER BY key`).all() as any[];
  const snippets = snippetRows.map((s) => ({
    key: s.key,
    type: s.type,
    name: s.name,
    description: s.description,
    variant: s.variant,
    bodyMd: s.body_md,
  }));

  const redirectRows = db.prepare(`SELECT * FROM redirect WHERE is_enabled = 1 ORDER BY from_path`).all() as any[];
  const redirects = redirectRows.map((r) => ({
    fromPath: r.from_path,
    toPath: r.to_path,
    statusCode: r.status_code,
  }));

  const seoRow = db.prepare(`SELECT * FROM seo_default WHERE scope = 'global'`).get() as any;
  const seo = {
    titleTemplate: seoRow?.title_template ?? "{page}",
    description: seoRow?.description ?? "",
    canonicalHost: seoRow?.canonical_host ?? "",
    ogPayload: seoRow ? JSON.parse(seoRow.og_payload_json) : {},
  };

  return { lanes, solutions, blocks, snippets, redirects, seo };
}

export function getCurrentRevision(): { revisionNumber: number; bundle: ConfigBundle; publishedAt: number } | null {
  const db = getSqlite();
  const row = db.prepare(`SELECT * FROM config_revision WHERE is_current = 1 LIMIT 1`).get() as any;
  if (!row) return null;
  return {
    revisionNumber: row.revision_number,
    bundle: JSON.parse(row.bundle_json),
    publishedAt: row.published_at,
  };
}
