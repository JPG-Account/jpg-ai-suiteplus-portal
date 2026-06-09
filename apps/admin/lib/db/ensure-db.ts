// Lazy DB initialization (Postgres) — runs the schema + initial seed on first
// pool open if the DB is empty. BTP CF containers boot without a separate
// migrate step; the first DB-touching request lazily prepares the DB.
//
// All operations are idempotent. Safe to call on every cold start.
import type { Pool } from "pg";
import { CREATE_TABLES_SQL } from "./migrate-sql";
import { randomUUID, randomBytes, createHash } from "node:crypto";

let _ensured = false;

export async function ensureDbReady(pool: Pool): Promise<void> {
  if (_ensured) return;

  // 1) Schema — every CREATE uses IF NOT EXISTS.
  await pool.query(CREATE_TABLES_SQL);

  // 2) ALTER TABLE ... ADD COLUMN IF NOT EXISTS — supported by Postgres >= 9.6.
  await addColumnIfMissing(
    pool,
    "user_account",
    "status",
    "TEXT NOT NULL DEFAULT 'active'",
  );
  await addColumnIfMissing(
    pool,
    "user_account",
    "invited_by",
    "TEXT REFERENCES user_account(id)",
  );
  await addColumnIfMissing(pool, "user_account", "invited_at", "BIGINT");
  await addColumnIfMissing(pool, "user_account", "external_id", "TEXT");

  // V0.9-Crawl-B · Composer V2 — per-block style + raw HTML/markdown payloads
  await addColumnIfMissing(
    pool,
    "page_block",
    "style_json",
    "TEXT NOT NULL DEFAULT '{}'",
  );
  await addColumnIfMissing(pool, "page_block", "html_payload", "TEXT");

  // 3) Seed default domain allowlist if table is empty.
  await seedDomainAllowlistIfEmpty(pool);

  // 4) Seed if config_revision is empty (truly fresh DB).
  const revRes = await pool.query<{ n: string }>(
    "SELECT COUNT(*)::text AS n FROM config_revision",
  );
  if (Number(revRes.rows[0]?.n ?? 0) === 0) {
    await seedFreshDb(pool);
  }

  // 5) Bootstrap Super Admin password: if AUTH_PROVIDER=local and the super admin
  // has no password yet, mint a one-shot set-password link and print it to stderr.
  if ((process.env.AUTH_PROVIDER ?? "dev").toLowerCase() === "local") {
    await bootstrapSuperAdminPasswordLink(pool);
  }

  _ensured = true;
}

async function bootstrapSuperAdminPasswordLink(pool: Pool): Promise<void> {
  const email = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!email) return;

  const userRes = await pool.query<{ id: string }>(
    "SELECT id FROM user_account WHERE email = $1",
    [email],
  );
  const user = userRes.rows[0];
  if (!user) return;

  const credRes = await pool.query(
    "SELECT 1 FROM password_credential WHERE user_id = $1",
    [user.id],
  );
  if ((credRes.rowCount ?? 0) > 0) return; // already set

  // Don't re-mint if a live unconsumed token already exists
  const now = Date.now();
  const existingRes = await pool.query(
    "SELECT 1 FROM password_reset_token WHERE user_id = $1 AND consumed_at IS NULL AND expires_at > $2",
    [user.id, now],
  );
  if ((existingRes.rowCount ?? 0) > 0) return;

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = now + 72 * 60 * 60 * 1000;
  await pool.query(
    "INSERT INTO password_reset_token (token_hash, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)",
    [tokenHash, user.id, expiresAt, now],
  );

  if (
    (process.env.BOOTSTRAP_PRINT_SETUP_LINK ?? "true").toLowerCase() !== "false"
  ) {
    const origin = process.env.ADMIN_BASE_URL ?? "http://localhost:3000";
    // Banner — stands out in `cf logs --recent | grep set-password`.
    // eslint-disable-next-line no-console
    console.warn(
      "\n\x1b[33m═══════════════════════════════════════════════════════════════",
    );
    // eslint-disable-next-line no-console
    console.warn("  SUPER ADMIN PASSWORD SETUP REQUIRED");
    // eslint-disable-next-line no-console
    console.warn(`  Email: ${email}`);
    // eslint-disable-next-line no-console
    console.warn(`  Open this URL within 72h to set your password:`);
    // eslint-disable-next-line no-console
    console.warn(`  ${origin}/set-password?token=${rawToken}`);
    // eslint-disable-next-line no-console
    console.warn(
      "═══════════════════════════════════════════════════════════════\x1b[0m\n",
    );
  }
}

async function addColumnIfMissing(
  pool: Pool,
  table: string,
  col: string,
  def: string,
): Promise<void> {
  try {
    // Postgres 9.6+ supports ADD COLUMN IF NOT EXISTS — simpler than information_schema check.
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${def}`);
  } catch (e) {
    // Best-effort — log and move on. Schema mismatch will surface at first query.
    // eslint-disable-next-line no-console
    console.warn(
      `[ensure-db] failed to add column ${table}.${col}: ${(e as Error).message}`,
    );
  }
}

async function seedDomainAllowlistIfEmpty(pool: Pool): Promise<void> {
  const res = await pool.query<{ n: string }>(
    "SELECT COUNT(*)::text AS n FROM auth_allowed_domain",
  );
  if (Number(res.rows[0]?.n ?? 0) > 0) return;

  const raw = (process.env.AUTH_ALLOWED_DOMAINS ?? "@ust.com,@ust-global.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const now = Date.now();
  for (const p of raw) {
    await pool.query(
      "INSERT INTO auth_allowed_domain (pattern, is_glob, created_at) VALUES ($1, $2, $3) ON CONFLICT (pattern) DO NOTHING",
      [p.toLowerCase(), false, now],
    );
  }
}

async function seedFreshDb(pool: Pool): Promise<void> {
  const superAdminEmail = (
    process.env.SUPER_ADMIN_EMAIL ?? "johnpatrick.galido@ust.com"
  )
    .trim()
    .toLowerCase();
  const superAdminName = process.env.SUPER_ADMIN_DISPLAY_NAME ?? "Super Admin";
  const now = Date.now();

  // ─── User: Super Admin (typically JP) ────────────────────────────
  const userId = "u_super_admin";
  await pool.query(
    `INSERT INTO user_account (id, email, display_name, created_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       display_name = EXCLUDED.display_name`,
    [userId, superAdminEmail, superAdminName, now],
  );
  await pool.query("DELETE FROM role_mapping WHERE user_id = $1", [userId]);
  await pool.query(
    "INSERT INTO role_mapping (id, user_id, role, granted_at) VALUES ($1, $2, $3, $4)",
    [randomUUID(), userId, "super_admin", now],
  );

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
  const laneIdBySlug: Record<string, string> = {};
  for (let i = 0; i < lanesData.length; i++) {
    const l = lanesData[i];
    const id = `lane_${l.slug}`;
    laneIdBySlug[l.slug] = id;
    await pool.query(
      `INSERT INTO lane (id, slug, name, audience, purpose, tags_json, sort_order, is_archived)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)`,
      [id, l.slug, l.name, l.audience, l.purpose, JSON.stringify(l.tags), i],
    );
  }

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

  for (let i = 0; i < capsData.length; i++) {
    const c = capsData[i];
    const capId = `cap_${c.slug}`;
    await pool.query(
      `INSERT INTO capability
        (id, slug, name, short_name, type, status, primary_lane_id, secondary_lane_ids_json,
         description, features_json, search_keywords, enabled, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, $12)`,
      [
        capId,
        c.slug,
        c.name,
        c.shortName ?? null,
        c.type,
        c.status,
        laneIdBySlug[c.primary],
        JSON.stringify(c.secondary.map((s) => laneIdBySlug[s])),
        c.description,
        JSON.stringify(c.features),
        c.searchKeywords,
        i,
      ],
    );
    await pool.query(
      `INSERT INTO tile
        (id, capability_id, route_kind, route_template, external_url, visibility, sort_order)
       VALUES ($1, $2, 'internal', $3, NULL, 'public', $4)`,
      [`tile_${c.slug}`, capId, c.routeTemplate, i],
    );
  }

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
  for (let i = 0; i < blocksData.length; i++) {
    const b = blocksData[i];
    await pool.query(
      `INSERT INTO page_block (id, page_key, block_type, label, subtitle, position, fields_json, is_enabled)
       VALUES ($1, 'home', $2, $3, $4, $5, $6, TRUE)`,
      [`blk_home_${b.type}_${i}`, b.type, b.label, b.subtitle, i, JSON.stringify(b.fields)],
    );
  }

  // ─── Snippets ────────────────────────────────────────────────────
  const snippetsData = [
    { key: "sapphire_cta", type: "CTA", name: "SAPPHIRE Edition CTA", description: "Dark teal CTA with primary + secondary action.", variant: "dark", bodyMd: "**Lead with SAPPHIRE Edition.**" },
    { key: "global_footer", type: "Footer", name: "Global footer", description: "4-column footer.", variant: "light", bodyMd: "© UST · AI Suite+ for SAP · Internal portfolio showcase" },
    { key: "no_endorsement", type: "Legal", name: "No-endorsement notice", description: "Approved positioning paragraph.", variant: "light", bodyMd: "UST AI Suite+ for SAP brings together AI-enabled accelerators, SAP-focused solution assets, value tools, industry demos, and practical enablement capabilities for SAP-led transformation." },
  ];
  for (const s of snippetsData) {
    await pool.query(
      `INSERT INTO snippet (id, key, type, name, description, body_md, variant, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [`snp_${s.key}`, s.key, s.type, s.name, s.description, s.bodyMd, s.variant, now],
    );
  }

  // ─── Redirects ────────────────────────────────────────────────────
  await pool.query(
    "INSERT INTO redirect (id, from_path, to_path, status_code, is_enabled) VALUES ($1, $2, $3, $4, TRUE)",
    ["rdr_ria", "/ria", "/capabilities/ria", 301],
  );
  await pool.query(
    "INSERT INTO redirect (id, from_path, to_path, status_code, is_enabled) VALUES ($1, $2, $3, $4, TRUE)",
    ["rdr_sapphire", "/sapphire-2026", "/?utm_source=sapphire&lane=industry", 302],
  );

  // ─── SEO defaults ────────────────────────────────────────────────
  await pool.query(
    `INSERT INTO seo_default
      (id, scope, title_template, description, canonical_host, og_payload_json, updated_at)
     VALUES ($1, 'global', $2, $3, $4, $5, $6)`,
    [
      "seo_global",
      "{page} · UST AI Suite+ for SAP",
      "UST AI Suite+ for SAP brings together AI-enabled accelerators, SAP-focused solution assets, value tools, industry demos, and practical enablement capabilities.",
      process.env.PORTAL_BASE_URL ?? "https://ust-ai-suite-plus-sap.cfapps.us10-001.hana.ondemand.com",
      JSON.stringify({ siteName: "UST AI Suite+ for SAP" }),
      now,
    ],
  );

  // ─── Build initial bundle + publish as revision 1 ────────────────
  const lanesRows = (
    await pool.query("SELECT * FROM lane ORDER BY sort_order")
  ).rows;
  const capRows = (
    await pool.query("SELECT * FROM capability ORDER BY sort_order")
  ).rows;
  const tileRows = (await pool.query("SELECT * FROM tile")).rows;
  const tileByCap = new Map(tileRows.map((t: any) => [t.capability_id, t]));
  const laneById = new Map(lanesRows.map((l: any) => [l.id, l]));

  const bundle = {
    lanes: lanesRows.map((l: any) => ({
      id: l.slug,
      name: l.name,
      audience: l.audience,
      purpose: l.purpose,
      tags: JSON.parse(l.tags_json),
    })),
    solutions: capRows.map((c: any) => ({
      id: c.slug,
      name: c.name,
      shortName: c.short_name ?? undefined,
      type: c.type,
      status: c.status,
      primaryLane: (laneById.get(c.primary_lane_id) as any).name,
      secondaryLanes: (JSON.parse(c.secondary_lane_ids_json) as string[])
        .map((id) => (laneById.get(id) as any)?.name)
        .filter(Boolean),
      description: c.description,
      features: JSON.parse(c.features_json),
      searchKeywords: c.search_keywords,
      enabled: !!c.enabled,
      route:
        (tileByCap.get(c.id) as any)?.route_template ??
        `/capabilities/${c.slug}`,
    })),
    blocks: (
      await pool.query(
        "SELECT * FROM page_block WHERE page_key='home' ORDER BY position",
      )
    ).rows,
    snippets: (await pool.query("SELECT * FROM snippet")).rows,
    redirects: (
      await pool.query("SELECT * FROM redirect WHERE is_enabled = TRUE")
    ).rows,
    seo: (
      await pool.query("SELECT * FROM seo_default WHERE scope='global'")
    ).rows[0],
  };

  await pool.query(
    `INSERT INTO config_revision
      (id, revision_number, bundle_json, published_at, published_by, notes, is_current)
     VALUES ($1, 1, $2, $3, $4, $5, TRUE)`,
    [randomUUID(), JSON.stringify(bundle), now, userId, "Initial lazy-seed on first boot"],
  );

  await pool.query(
    `INSERT INTO audit_event
      (id, actor_user_id, action, entity_type, entity_id, before_json, after_json, request_id, created_at)
     VALUES ($1, $2, 'seed.lazy', 'database', NULL, NULL, $3, NULL, $4)`,
    [
      randomUUID(),
      userId,
      JSON.stringify({
        lanes: lanesData.length,
        capabilities: capsData.length,
        blocks: blocksData.length,
        viaSuperAdminEmail: superAdminEmail,
      }),
      now,
    ],
  );
}
