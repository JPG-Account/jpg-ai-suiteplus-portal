// Lazy DB initialization — runs the schema + initial seed on first sqlite open
// if the DB is empty. This means BTP CF containers don't need a separate
// migrate/seed step; the first request lazily prepares the DB.
// Local dev still has `pnpm db:migrate` + `db:seed` for explicit reset.
import type Database from "better-sqlite3";
import { CREATE_TABLES_SQL } from "./migrate-sql";
import { randomUUID } from "node:crypto";

let _ensured = false;

export function ensureDbReady(db: Database.Database): void {
  if (_ensured) return;

  // 1) Schema — CREATE TABLE IF NOT EXISTS keeps this idempotent.
  db.exec(CREATE_TABLES_SQL);

  // 2) ALTER columns — only add if missing (SQLite lacks ALTER ... IF NOT EXISTS).
  addColumnIfMissing(db, "user_account", "status", `TEXT NOT NULL DEFAULT 'active'`);
  addColumnIfMissing(db, "user_account", "invited_by", `TEXT REFERENCES user_account(id)`);
  addColumnIfMissing(db, "user_account", "invited_at", `INTEGER`);
  addColumnIfMissing(db, "user_account", "external_id", `TEXT`);

  // V0.9-Crawl-B · Composer V2 — per-block style + raw HTML/markdown payloads
  addColumnIfMissing(db, "page_block", "style_json", `TEXT NOT NULL DEFAULT '{}'`);
  addColumnIfMissing(db, "page_block", "html_payload", `TEXT`);

  // 3) Seed default domain allowlist if table is empty.
  seedDomainAllowlistIfEmpty(db);

  // 4) Seed if config_revision is empty (truly fresh DB).
  const revRow = db.prepare(`SELECT COUNT(*) AS n FROM config_revision`).get() as any;
  if ((revRow?.n ?? 0) === 0) {
    seedFreshDb(db);
  }

  // 5) Bootstrap Super Admin password: if AUTH_PROVIDER=local and the super admin
  // has no password yet, mint a one-shot set-password link and print it to stderr.
  if ((process.env.AUTH_PROVIDER ?? "dev").toLowerCase() === "local") {
    bootstrapSuperAdminPasswordLink(db);
  }

  _ensured = true;
}

function bootstrapSuperAdminPasswordLink(db: Database.Database) {
  const email = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!email) return;
  const user = db.prepare(`SELECT * FROM user_account WHERE email = ?`).get(email) as any;
  if (!user) return;
  const cred = db.prepare(`SELECT 1 FROM password_credential WHERE user_id = ?`).get(user.id);
  if (cred) return; // already set
  // Don't re-mint if a live unconsumed token already exists
  const existing = db.prepare(`SELECT 1 FROM password_reset_token WHERE user_id = ? AND consumed_at IS NULL AND expires_at > ?`).get(user.id, Date.now());
  if (existing) return;

  // Inline token mint (avoids circular import with local-password-provider).
  const { randomBytes, createHash } = require("node:crypto");
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const now = Date.now();
  const expiresAt = now + 72 * 60 * 60 * 1000;
  db.prepare(`INSERT INTO password_reset_token (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`)
    .run(tokenHash, user.id, expiresAt, now);

  if ((process.env.BOOTSTRAP_PRINT_SETUP_LINK ?? "true").toLowerCase() !== "false") {
    const origin = process.env.ADMIN_BASE_URL ?? "http://localhost:3000";
    // Use a banner so it stands out in server logs.
    console.warn("\n\x1b[33m═══════════════════════════════════════════════════════════════");
    console.warn("  SUPER ADMIN PASSWORD SETUP REQUIRED");
    console.warn(`  Email: ${email}`);
    console.warn(`  Open this URL within 72h to set your password:`);
    console.warn(`  ${origin}/set-password?token=${rawToken}`);
    console.warn("═══════════════════════════════════════════════════════════════\x1b[0m\n");
  }
}

function addColumnIfMissing(db: Database.Database, table: string, col: string, def: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  if (rows.some((r) => r.name === col)) return;
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  } catch (e) {
    // Best-effort — log and move on. Schema mismatch will surface at first query.
    console.warn(`[ensure-db] failed to add column ${table}.${col}: ${(e as Error).message}`);
  }
}

function seedDomainAllowlistIfEmpty(db: Database.Database) {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM auth_allowed_domain`).get() as any;
  if ((row?.n ?? 0) > 0) return;
  const raw = (process.env.AUTH_ALLOWED_DOMAINS ?? "@ust.com,@ust-global.com").split(",").map((s) => s.trim()).filter(Boolean);
  const ins = db.prepare(`INSERT OR IGNORE INTO auth_allowed_domain (pattern, is_glob, created_at) VALUES (?, 0, ?)`);
  const now = Date.now();
  for (const p of raw) ins.run(p.toLowerCase(), now);
}

function seedFreshDb(db: Database.Database) {
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL ?? "johnpatrick.galido@ust.com").trim().toLowerCase();
  const superAdminName = process.env.SUPER_ADMIN_DISPLAY_NAME ?? "Super Admin";
  const now = Date.now();

  // ─── User: Super Admin (typically JP) ────────────────────────────
  const userId = "u_super_admin";
  db.prepare(`INSERT OR REPLACE INTO user_account (id, email, display_name, created_at) VALUES (?, ?, ?, ?)`)
    .run(userId, superAdminEmail, superAdminName, now);
  db.prepare(`DELETE FROM role_mapping WHERE user_id = ?`).run(userId);
  db.prepare(`INSERT INTO role_mapping (id, user_id, role, granted_at) VALUES (?, ?, ?, ?)`)
    .run(randomUUID(), userId, "super_admin", now);

  // ─── Lanes (9) ────────────────────────────────────────────────────
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
  const insertLane = db.prepare(`INSERT INTO lane (id, slug, name, audience, purpose, tags_json, sort_order, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`);
  const laneIdBySlug: Record<string, string> = {};
  lanesData.forEach((l, i) => {
    const id = `lane_${l.slug}`;
    laneIdBySlug[l.slug] = id;
    insertLane.run(id, l.slug, l.name, l.audience, l.purpose, JSON.stringify(l.tags), i);
  });

  // ─── Capabilities + Tiles (8) ────────────────────────────────────
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
  const insertCap = db.prepare(`INSERT INTO capability (id, slug, name, short_name, type, status, primary_lane_id, secondary_lane_ids_json, description, features_json, search_keywords, enabled, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`);
  const insertTile = db.prepare(`INSERT INTO tile (id, capability_id, route_kind, route_template, external_url, visibility, sort_order) VALUES (?, ?, 'internal', ?, NULL, 'public', ?)`);
  capsData.forEach((c, i) => {
    const capId = `cap_${c.slug}`;
    insertCap.run(capId, c.slug, c.name, c.shortName ?? null, c.type, c.status, laneIdBySlug[c.primary], JSON.stringify(c.secondary.map((s) => laneIdBySlug[s])), c.description, JSON.stringify(c.features), c.searchKeywords, i);
    insertTile.run(`tile_${c.slug}`, capId, c.routeTemplate, i);
  });

  // ─── Landing page blocks ──────────────────────────────────────────
  const blocksData = [
    { type: "hero", label: "Hero", subtitle: "Showcase canvas · animated", fields: { eyebrow: "UST SAP capability showcase", headline: "UST AI Suite+ for SAP", subhead: "A modern portfolio of AI-enabled accelerators, SAP-focused solution assets, and practical business tools that help clients assess faster, decide with confidence, improve operations, and move transformation work forward." } },
    { type: "overview-band", label: "Overview band", subtitle: "4 KPI cards", fields: {} },
    { type: "lanes", label: "Lane grid", subtitle: "9 audience lanes", fields: {} },
    { type: "capabilities", label: "Capability grid", subtitle: "auto-bound to enabled tiles", fields: {} },
    { type: "value", label: "Where it helps", subtitle: "3 story cards", fields: {} },
    { type: "tapestry", label: "Capability fabric", subtitle: "5-tile tapestry", fields: {} },
    { type: "at-a-glance", label: "At-a-glance summary", subtitle: "3-panel chart zone", fields: {} },
    { type: "cta", label: "Lead-with-story CTA", subtitle: "primary + secondary actions", fields: { headline: "Lead with the right story.", subhead: "Use UST AI Suite+ for SAP to guide the conversation from client need to practical capability." } },
    { type: "footer", label: "Footer", subtitle: "from Snippets · global", fields: {} },
  ];
  const insertBlock = db.prepare(`INSERT INTO page_block (id, page_key, block_type, label, subtitle, position, fields_json, is_enabled) VALUES (?, 'home', ?, ?, ?, ?, ?, 1)`);
  blocksData.forEach((b, i) => insertBlock.run(`blk_home_${b.type}_${i}`, b.type, b.label, b.subtitle, i, JSON.stringify(b.fields)));

  // ─── Snippets ────────────────────────────────────────────────────
  const snippetsData = [
    { key: "sapphire_cta", type: "CTA", name: "SAPPHIRE Edition CTA", description: "Dark teal CTA with primary + secondary action.", variant: "dark", bodyMd: "**Lead with SAPPHIRE Edition.**" },
    { key: "global_footer", type: "Footer", name: "Global footer", description: "4-column footer.", variant: "light", bodyMd: "© UST · AI Suite+ for SAP · Internal portfolio showcase" },
    { key: "no_endorsement", type: "Legal", name: "No-endorsement notice", description: "Approved positioning paragraph.", variant: "light", bodyMd: "UST AI Suite+ for SAP brings together AI-enabled accelerators, SAP-focused solution assets, value tools, industry demos, and practical enablement capabilities for SAP-led transformation." },
  ];
  const insertSnippet = db.prepare(`INSERT INTO snippet (id, key, type, name, description, body_md, variant, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  snippetsData.forEach((s) => insertSnippet.run(`snp_${s.key}`, s.key, s.type, s.name, s.description, s.bodyMd, s.variant, now));

  // ─── Redirects ────────────────────────────────────────────────────
  const insertRedirect = db.prepare(`INSERT INTO redirect (id, from_path, to_path, status_code, is_enabled) VALUES (?, ?, ?, ?, 1)`);
  insertRedirect.run(`rdr_ria`, "/ria", "/capabilities/ria", 301);
  insertRedirect.run(`rdr_sapphire`, "/sapphire-2026", "/?utm_source=sapphire&lane=industry", 302);

  // ─── SEO defaults ────────────────────────────────────────────────
  db.prepare(`INSERT INTO seo_default (id, scope, title_template, description, canonical_host, og_payload_json, updated_at) VALUES (?, 'global', ?, ?, ?, ?, ?)`)
    .run("seo_global", "{page} · UST AI Suite+ for SAP", "UST AI Suite+ for SAP brings together AI-enabled accelerators, SAP-focused solution assets, value tools, industry demos, and practical enablement capabilities.", process.env.PORTAL_BASE_URL ?? "https://ust-ai-suite-plus-sap.cfapps.us10-001.hana.ondemand.com", JSON.stringify({ siteName: "UST AI Suite+ for SAP" }), now);

  // ─── Build initial bundle + publish as revision 1 ────────────────
  const lanesRows = db.prepare(`SELECT * FROM lane ORDER BY sort_order`).all() as any[];
  const capRows = db.prepare(`SELECT * FROM capability ORDER BY sort_order`).all() as any[];
  const tileRows = db.prepare(`SELECT * FROM tile`).all() as any[];
  const tileByCap = new Map(tileRows.map((t: any) => [t.capability_id, t]));
  const laneById = new Map(lanesRows.map((l: any) => [l.id, l]));
  const bundle = {
    lanes: lanesRows.map((l: any) => ({ id: l.slug, name: l.name, audience: l.audience, purpose: l.purpose, tags: JSON.parse(l.tags_json) })),
    solutions: capRows.map((c: any) => ({
      id: c.slug, name: c.name, shortName: c.short_name ?? undefined, type: c.type, status: c.status,
      primaryLane: (laneById.get(c.primary_lane_id) as any).name,
      secondaryLanes: (JSON.parse(c.secondary_lane_ids_json) as string[]).map((id) => (laneById.get(id) as any)?.name).filter(Boolean),
      description: c.description, features: JSON.parse(c.features_json), searchKeywords: c.search_keywords,
      enabled: !!c.enabled, route: (tileByCap.get(c.id) as any)?.route_template ?? `/capabilities/${c.slug}`,
    })),
    blocks: db.prepare(`SELECT * FROM page_block WHERE page_key='home' ORDER BY position`).all(),
    snippets: db.prepare(`SELECT * FROM snippet`).all(),
    redirects: db.prepare(`SELECT * FROM redirect WHERE is_enabled = 1`).all(),
    seo: db.prepare(`SELECT * FROM seo_default WHERE scope='global'`).get(),
  };

  db.prepare(`INSERT INTO config_revision (id, revision_number, bundle_json, published_at, published_by, notes, is_current) VALUES (?, 1, ?, ?, ?, ?, 1)`)
    .run(randomUUID(), JSON.stringify(bundle), now, userId, "Initial lazy-seed on first boot");

  db.prepare(`INSERT INTO audit_event (id, actor_user_id, action, entity_type, entity_id, before_json, after_json, request_id, created_at) VALUES (?, ?, 'seed.lazy', 'database', NULL, NULL, ?, NULL, ?)`)
    .run(randomUUID(), userId, JSON.stringify({ lanes: lanesData.length, capabilities: capsData.length, blocks: blocksData.length, viaSuperAdminEmail: superAdminEmail }), now);
}
