// Run `pnpm db:seed` to populate the DB with initial Suite+ data.
// JP is seeded as Super Admin. Lanes/capabilities/tiles mirror the portal's
// current registry. An initial config_revision (v1) is published so the
// portal can fetch /api/config/current and render identically.

import Database from "better-sqlite3";
import path from "node:path";
import { randomUUID } from "node:crypto";
import fs from "node:fs";

// Read .env.local manually (Next runtime is not loaded in standalone scripts)
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .forEach((l) => {
      const [k, ...rest] = l.split("=");
      if (!process.env[k.trim()]) process.env[k.trim()] = rest.join("=").trim();
    });
}

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "johnpatrick.galido@ust.com";
const SUPER_ADMIN_DISPLAY_NAME = process.env.SUPER_ADMIN_DISPLAY_NAME ?? "John Patrick Galido";

const DB_PATH = path.resolve(process.cwd(), "data", "suite-plus.sqlite");
const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");

const now = Date.now();

// ─── User: JP as Super Admin ─────────────────────────────────────────
const jpUserId = "u_jp_galido";
db.prepare(`INSERT OR REPLACE INTO user_account (id, email, display_name, created_at) VALUES (?, ?, ?, ?)`)
  .run(jpUserId, SUPER_ADMIN_EMAIL, SUPER_ADMIN_DISPLAY_NAME, now);

db.prepare(`DELETE FROM role_mapping WHERE user_id = ?`).run(jpUserId);
db.prepare(`INSERT INTO role_mapping (id, user_id, role, granted_at) VALUES (?, ?, ?, ?)`)
  .run(randomUUID(), jpUserId, "super_admin", now);

console.log(`✓ Super Admin: ${SUPER_ADMIN_EMAIL}`);

// ─── Lanes (9) ───────────────────────────────────────────────────────
const lanesData = [
  { slug: "executives", name: "AI for Executives", audience: "CIO, CFO, COO, transformation leaders", purpose: "Decision visibility, value, risk, and prioritization.", tags: ["ROI Calculator", "Rapid Assessment"] },
  { slug: "architects", name: "AI for Architects", audience: "Enterprise, solution, integration, data architects", purpose: "Architecture impact, modernization options, and standards alignment.", tags: ["RIA", "Rapid Assessment"] },
  { slug: "business", name: "AI for Business", audience: "Process owners, operations leaders, super users", purpose: "Business process improvement and day-to-day decision support.", tags: ["FlexIOM", "Trade Promotion Optimizer"] },
  { slug: "consultants", name: "AI for Consultants", audience: "Functional consultants, PMO, BAs, SMEs", purpose: "Faster analysis, workshops, documentation, and delivery outputs.", tags: ["Rapid Assessment", "RIA"] },
  { slug: "developers", name: "AI for Developers", audience: "Developers, technical leads, QA", purpose: "Code, test, transport, object, and release quality.", tags: ["RIA", "Impact analysis"] },
  { slug: "ops", name: "AI for Ops", audience: "AMS, ITSM, support, service owners", purpose: "Reduce recurring work, improve support quality, and enable users.", tags: ["Client University", "RIA"] },
  { slug: "governance", name: "AI for Governance", audience: "Risk, compliance, audit, security", purpose: "Better control, evidence, and policy adherence.", tags: ["RIA", "Rapid Assessment"] },
  { slug: "finance", name: "AI for Finance", audience: "CFO, finance operations, value office", purpose: "Business case, cost, and value tracking.", tags: ["ROI Calculator", "Trade Promotion Optimizer"] },
  { slug: "industry", name: "AI for Industry / Domain", audience: "Industry leaders and domain specialists", purpose: "Industry-focused accelerators and solution stories by sector.", tags: ["CX for Life Sciences", "CX for Insurance", "Trade Promotion Optimizer"] },
];

db.prepare(`DELETE FROM lane`).run();
const insertLane = db.prepare(`INSERT INTO lane (id, slug, name, audience, purpose, tags_json, sort_order, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`);
const laneIdBySlug: Record<string, string> = {};
lanesData.forEach((l, i) => {
  const id = `lane_${l.slug}`;
  laneIdBySlug[l.slug] = id;
  insertLane.run(id, l.slug, l.name, l.audience, l.purpose, JSON.stringify(l.tags), i);
});
console.log(`✓ ${lanesData.length} lanes seeded`);

// ─── Capabilities + Tiles (8) ────────────────────────────────────────
const capsData = [
  { slug: "ria", name: "RIA", shortName: "Rapid Impact Analyzer", type: "AI-assisted analyzer", status: "live", primary: "developers", secondary: ["architects", "consultants", "ops", "governance"], description: "See what a proposed SAP change may touch before it moves forward.", features: ["Maps likely impact across modules, objects, and tests", "Highlights coverage gaps and potential risk areas", "Useful for delivery, quality, and governance conversations"], searchKeywords: "RIA Rapid Impact Analyzer SAP change impact custom code testing transport quality release risk", routeTemplate: "/capabilities/ria" },
  { slug: "client-university", name: "Client University", type: "Enablement solution", status: "demo", primary: "ops", secondary: ["business", "consultants"], description: "Give support teams and business users a faster path to learning, adoption, and self-service guidance.", features: ["Turns approved knowledge into structured learning journeys", "Supports AMS, business enablement, and user adoption", "Reduces repeat questions and supports guided learning"], searchKeywords: "Client University enablement learning support AMS knowledge training adoption user help", routeTemplate: "/capabilities/client-university" },
  { slug: "rapid-assessment", name: "Rapid Assessment", type: "Assessment accelerator", status: "demo", primary: "consultants", secondary: ["executives", "architects", "governance"], description: "Structure discovery and readiness work into clearer, faster client-facing outputs.", features: ["Supports current-state review and readiness conversations", "Helps teams frame priorities, gaps, and next steps", "Useful for workshops, proposals, and roadmaps"], searchKeywords: "Rapid Assessment discovery readiness workshop proposal roadmap gap analysis", routeTemplate: "/capabilities/rapid-assessment" },
  { slug: "roi-calculator", name: "ROI Calculator", type: "Calculator", status: "demo", primary: "finance", secondary: ["executives", "consultants"], description: "Build credible value cases and compare scenarios with more confidence.", features: ["Supports business case and benefit discussion", "Helps align value story to executive priorities", "Useful for investment decisions and proposal shaping"], searchKeywords: "ROI Calculator business case value benefits cost savings scenario finance benefit realization", routeTemplate: "/capabilities/roi-calculator" },
  { slug: "trade-promotion-optimizer", name: "Trade Promotion Optimizer", type: "Industry accelerator", status: "demo", primary: "industry", secondary: ["business", "finance"], description: "Support smarter trade promotion planning and better commercial decision making.", features: ["Helps frame promotion options and likely outcomes", "Supports finance and business alignment", "Useful for CPG and revenue growth discussions"], searchKeywords: "Trade Promotion Optimizer trade promotion CPG planning optimization finance business margin", routeTemplate: "/capabilities/trade-promotion-optimizer" },
  { slug: "cx-life-sciences", name: "CX for Life Sciences", type: "Industry solution", status: "available", primary: "industry", secondary: ["business", "executives"], description: "Show how customer experience capabilities can be shaped for Life Sciences needs.", features: ["Industry-centered story for engagement and service", "Useful for customer-facing transformation discussions", "Brings domain context into SAP CX conversations"], searchKeywords: "CX for Life Sciences customer experience life sciences industry engagement service sales", routeTemplate: "/capabilities/cx-life-sciences" },
  { slug: "cx-insurance", name: "CX for Insurance", type: "Industry solution", status: "available", primary: "industry", secondary: ["business", "executives"], description: "Show how customer experience patterns can be shaped for Insurance journeys and service models.", features: ["Useful for policyholder, service, and engagement stories", "Supports front-office transformation discussions", "Connects SAP CX capability to industry context"], searchKeywords: "CX for Insurance customer experience insurance policy claims service sales industry", routeTemplate: "/capabilities/cx-insurance" },
  { slug: "flexiom", name: "FlexIOM", type: "SAP solution accelerator", status: "available", primary: "business", secondary: ["industry", "executives"], description: "Support intelligent order management and availability-to-promise scenarios for better fulfillment decisions.", features: ["Strong fit for supply, order, and customer commitment discussions", "Useful for business and SAP stakeholders alike", "Shows practical value beyond pure AI narratives"], searchKeywords: "FlexIOM intelligent order management aATP order promising supply chain business fulfillment", routeTemplate: "/capabilities/flexiom" },
];

db.prepare(`DELETE FROM tile`).run();
db.prepare(`DELETE FROM capability`).run();

const insertCap = db.prepare(`INSERT INTO capability (id, slug, name, short_name, type, status, primary_lane_id, secondary_lane_ids_json, description, features_json, search_keywords, enabled, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`);
const insertTile = db.prepare(`INSERT INTO tile (id, capability_id, route_kind, route_template, external_url, visibility, sort_order) VALUES (?, ?, 'internal', ?, NULL, 'public', ?)`);

capsData.forEach((c, i) => {
  const capId = `cap_${c.slug}`;
  insertCap.run(
    capId, c.slug, c.name, c.shortName ?? null, c.type, c.status,
    laneIdBySlug[c.primary],
    JSON.stringify(c.secondary.map((s) => laneIdBySlug[s])),
    c.description, JSON.stringify(c.features), c.searchKeywords, i,
  );
  insertTile.run(`tile_${c.slug}`, capId, c.routeTemplate, i);
});
console.log(`✓ ${capsData.length} capabilities + tiles seeded`);

// ─── Landing page blocks (mirror the live portal) ────────────────────
const blocksData = [
  { type: "hero", label: "Hero", subtitle: "Showcase canvas · animated", fields: { eyebrow: "UST SAP capability showcase", headline: "UST AI Suite+ for SAP", subhead: "A modern portfolio of AI-enabled accelerators, SAP-focused solution assets, and practical business tools that help clients assess faster, decide with confidence, improve operations, and move transformation work forward." } },
  { type: "overview-band", label: "Overview band", subtitle: "4 KPI cards", fields: {} },
  { type: "lanes", label: "Lane grid", subtitle: "9 audience lanes", fields: {} },
  { type: "capabilities", label: "Capability grid", subtitle: "auto-bound to enabled tiles", fields: {} },
  { type: "value", label: "Where it helps", subtitle: "3 story cards", fields: {} },
  { type: "tapestry", label: "Capability fabric", subtitle: "5-tile tapestry", fields: {} },
  { type: "at-a-glance", label: "At-a-glance summary", subtitle: "3-panel chart zone", fields: {} },
  { type: "cta", label: "Lead-with-story CTA", subtitle: "primary + secondary actions", fields: { headline: "Lead with the right story.", subhead: "Use UST AI Suite+ for SAP to guide the conversation from client need to practical capability, then rely on the governance model to keep content approved, consistent, and safe." } },
  { type: "footer", label: "Footer", subtitle: "from Snippets · global", fields: {} },
];
db.prepare(`DELETE FROM page_block WHERE page_key = 'home'`).run();
const insertBlock = db.prepare(`INSERT INTO page_block (id, page_key, block_type, label, subtitle, position, fields_json, is_enabled) VALUES (?, 'home', ?, ?, ?, ?, ?, 1)`);
blocksData.forEach((b, i) => {
  insertBlock.run(`blk_home_${b.type}_${i}`, b.type, b.label, b.subtitle, i, JSON.stringify(b.fields));
});
console.log(`✓ ${blocksData.length} landing blocks seeded`);

// ─── Snippets ────────────────────────────────────────────────────────
const snippetsData = [
  { key: "sapphire_cta", type: "CTA", name: "SAPPHIRE Edition CTA", description: "Dark teal CTA with primary + secondary action.", variant: "dark", bodyMd: "**Lead with SAPPHIRE Edition.** A focused take on Suite+ for the conference floor." },
  { key: "global_footer", type: "Footer", name: "Global footer", description: "4-column footer with quick-links and meta row.", variant: "light", bodyMd: "© UST · AI Suite+ for SAP · Internal portfolio showcase" },
  { key: "no_endorsement", type: "Legal", name: "No-endorsement notice", description: "Approved positioning paragraph.", variant: "light", bodyMd: "UST AI Suite+ for SAP brings together AI-enabled accelerators, SAP-focused solution assets, value tools, industry demos, and practical enablement capabilities for SAP-led transformation." },
];
db.prepare(`DELETE FROM snippet`).run();
const insertSnippet = db.prepare(`INSERT INTO snippet (id, key, type, name, description, body_md, variant, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
snippetsData.forEach((s) => {
  insertSnippet.run(`snp_${s.key}`, s.key, s.type, s.name, s.description, s.bodyMd, s.variant, now);
});
console.log(`✓ ${snippetsData.length} snippets seeded`);

// ─── Redirects ───────────────────────────────────────────────────────
const redirectsData = [
  { fromPath: "/ria", toPath: "/capabilities/ria", statusCode: 301 },
  { fromPath: "/sapphire-2026", toPath: "/?utm_source=sapphire&lane=industry", statusCode: 302 },
];
db.prepare(`DELETE FROM redirect`).run();
const insertRedirect = db.prepare(`INSERT INTO redirect (id, from_path, to_path, status_code, is_enabled) VALUES (?, ?, ?, ?, 1)`);
redirectsData.forEach((r) => {
  insertRedirect.run(`rdr_${r.fromPath.replace(/[^a-z0-9]+/gi, "_")}`, r.fromPath, r.toPath, r.statusCode);
});
console.log(`✓ ${redirectsData.length} redirects seeded`);

// ─── SEO defaults ────────────────────────────────────────────────────
db.prepare(`DELETE FROM seo_default WHERE scope = 'global'`).run();
db.prepare(`INSERT INTO seo_default (id, scope, title_template, description, canonical_host, og_payload_json, updated_at) VALUES (?, 'global', ?, ?, ?, ?, ?)`)
  .run(
    "seo_global",
    "{page} · UST AI Suite+ for SAP",
    "UST AI Suite+ for SAP brings together AI-enabled accelerators, SAP-focused solution assets, value tools, industry demos, and practical enablement capabilities.",
    "https://ust-ai-suite-plus-sap.cfapps.us10-001.hana.ondemand.com",
    JSON.stringify({ siteName: "UST AI Suite+ for SAP" }),
    now,
  );
console.log(`✓ SEO defaults seeded`);

// ─── Build initial bundle + publish as revision 1 ────────────────────
function buildBundle() {
  const lanesRows = db.prepare(`SELECT * FROM lane ORDER BY sort_order`).all() as any[];
  const capRows = db.prepare(`SELECT * FROM capability ORDER BY sort_order`).all() as any[];
  const tileRows = db.prepare(`SELECT * FROM tile`).all() as any[];
  const tileByCap = new Map(tileRows.map((t) => [t.capability_id, t]));
  const laneById = new Map(lanesRows.map((l) => [l.id, l]));

  const lanes = lanesRows.map((l) => ({
    id: l.slug,
    name: l.name,
    audience: l.audience,
    purpose: l.purpose,
    tags: JSON.parse(l.tags_json),
  }));

  const solutions = capRows.map((c) => {
    const tileRow = tileByCap.get(c.id);
    return {
      id: c.slug,
      name: c.name,
      shortName: c.short_name ?? undefined,
      type: c.type,
      status: c.status,
      primaryLane: laneById.get(c.primary_lane_id).name,
      secondaryLanes: (JSON.parse(c.secondary_lane_ids_json) as string[]).map((id) => laneById.get(id)?.name).filter(Boolean),
      description: c.description,
      features: JSON.parse(c.features_json),
      searchKeywords: c.search_keywords,
      enabled: !!c.enabled,
      route: tileRow?.route_template ?? `/capabilities/${c.slug}`,
    };
  });

  const blocks = db.prepare(`SELECT * FROM page_block WHERE page_key = 'home' ORDER BY position`).all() as any[];
  const snippets = db.prepare(`SELECT * FROM snippet`).all() as any[];
  const redirects = db.prepare(`SELECT * FROM redirect WHERE is_enabled = 1`).all() as any[];
  const seo = db.prepare(`SELECT * FROM seo_default WHERE scope = 'global'`).get() as any;

  return { lanes, solutions, blocks, snippets, redirects, seo };
}

const bundle = buildBundle();
const bundleJson = JSON.stringify(bundle, null, 2);

db.prepare(`UPDATE config_revision SET is_current = 0`).run();
db.prepare(`DELETE FROM config_revision WHERE revision_number = 1`).run();
db.prepare(`INSERT INTO config_revision (id, revision_number, bundle_json, published_at, published_by, notes, is_current) VALUES (?, 1, ?, ?, ?, 'Initial seed', 1)`)
  .run(randomUUID(), bundleJson, now, jpUserId);

console.log(`✓ Revision 1 published (${bundleJson.length} bytes)`);

// ─── Audit ───────────────────────────────────────────────────────────
db.prepare(`INSERT INTO audit_event (id, actor_user_id, action, entity_type, entity_id, before_json, after_json, created_at) VALUES (?, ?, 'seed', 'database', NULL, NULL, ?, ?)`)
  .run(randomUUID(), jpUserId, JSON.stringify({ lanes: lanesData.length, capabilities: capsData.length, blocks: blocksData.length }), now);

console.log(`\n✓ Seed complete · DB at ${DB_PATH}`);
db.close();
