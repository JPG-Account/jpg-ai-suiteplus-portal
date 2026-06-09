// ─── Mock data registries ─ V0 only · no backend ───────────────────────
import type {
  Capability, User, Snippet, ScheduleEvent, Approval, AuditEvent,
  Redirect, ScimError, ComposerBlock, SiteHealthKpi, RevisionDiff,
} from "../types";

// ─── Capabilities (8 tiles) ────────────────────────────────────────────
export const capabilities: Capability[] = [
  {
    id: "ria", name: "RIA", subtitle: "Rapid Impact Analyzer",
    lanes: ["AI for Developers", "AI for Architects", "AI for Consultants", "AI for Ops", "AI for Governance"],
    routeTemplate: "capability/ria → /assessment/{tenantId}",
    status: "live", visibility: "public", health: "healthy",
    destinationName: "ria-prod", p95: "0.6s", lastGood: "now",
    lastEdited: { who: "JP", when: "2h ago" },
  },
  {
    id: "cu", name: "Client University", subtitle: "Enablement solution",
    lanes: ["AI for Ops", "AI for Business"],
    routeTemplate: "capability/cu → /learn/{moduleId}",
    status: "demo", visibility: "public", health: "healthy",
    destinationName: "cu-prod", p95: "0.9s", lastGood: "now",
    lastEdited: { who: "PS", when: "Yesterday" },
  },
  {
    id: "ra", name: "Rapid Assessment", subtitle: "Assessment accelerator",
    lanes: ["AI for Consultants", "AI for Executives"],
    routeTemplate: "capability/ra → /assessment/new",
    status: "demo", visibility: "public", health: "healthy",
    destinationName: "ra-prod", p95: "1.1s", lastGood: "now",
    lastEdited: { who: "MJ", when: "3d ago" },
  },
  {
    id: "roi", name: "ROI Calculator", subtitle: "Calculator",
    lanes: ["AI for Finance", "AI for Executives"],
    routeTemplate: "capability/roi → /calculator",
    status: "demo", visibility: "public", health: "healthy",
    destinationName: "roi-prod", p95: "0.4s", lastGood: "now",
    lastEdited: { who: "RK", when: "5d ago" },
  },
  {
    id: "tpo", name: "Trade Promotion Optimizer", subtitle: "Industry accelerator",
    lanes: ["AI for Industry / Domain", "AI for Business"],
    routeTemplate: "capability/tpo → /plans/{planId}",
    status: "demo", visibility: "role-gated", health: "healthy",
    destinationName: "tpo-prod", p95: "1.4s", lastGood: "now",
    lastEdited: { who: "AB", when: "1w ago" },
  },
  {
    id: "cx-ls", name: "CX for Life Sciences", subtitle: "Industry solution",
    lanes: ["AI for Industry / Domain", "AI for Business"],
    routeTemplate: "capability/cx-ls → /journeys",
    status: "available", visibility: "public", health: "healthy",
    destinationName: "cx-ls-prod", p95: "1.2s", lastGood: "now",
    lastEdited: { who: "MJ", when: "2w ago" },
  },
  {
    id: "cx-ins", name: "CX for Insurance", subtitle: "Industry solution",
    lanes: ["AI for Industry / Domain", "AI for Business"],
    routeTemplate: "capability/cx-ins → /policies",
    status: "available", visibility: "public", health: "slow",
    destinationName: "cx-ins-prod", p95: "4.2s", lastGood: "14:08",
    lastEdited: { who: "MJ", when: "2w ago" },
  },
  {
    id: "flexiom", name: "FlexIOM", subtitle: "SAP solution accelerator",
    lanes: ["AI for Business", "AI for Industry / Domain"],
    routeTemplate: "capability/flexiom → /orders/{orderId}",
    status: "danger", visibility: "role-gated", health: "down",
    destinationName: "flexiom-prod", p95: "timeout", lastGood: "09:14",
    lastEdited: { who: "RK", when: "3w ago" },
  },
];

// ─── Users (sample subset of 412 total) ─────────────────────────────────
export const users: User[] = [
  { id: "u_jp", initials: "JP", avatarClass: "a1", name: "John Patrick Galido", email: "john.galido@ust.com", role: "suite", roleLabel: "Suite Admin", iasGroups: ["ust-sap-gtm", "ust-suite-admins"], active: true, status: "active", lastActive: "Now" },
  { id: "u_mj", initials: "MJ", avatarClass: "a3", name: "Mohamed Jafeen H. K.", email: "mohamed.kabeer@ust.com", role: "approve", roleLabel: "Content Approver", iasGroups: ["ust-sap-content"], active: true, status: "active", lastActive: "2h ago" },
  { id: "u_ps", initials: "PS", avatarClass: "a5", name: "Priya Sharma", email: "priya.sharma@ust.com", role: "cap", roleLabel: "Capability Owner · RIA", iasGroups: ["ust-ria-leads"], active: true, status: "active", lastActive: "3h ago" },
  { id: "u_rk", initials: "RK", avatarClass: "a2", name: "Rakesh Kumar", email: "rakesh.kumar@ust.com", role: "suite", roleLabel: "Suite Admin", iasGroups: ["ust-suite-admins", "ust-integrations"], active: true, status: "active", lastActive: "5h ago" },
  { id: "u_ab", initials: "AB", avatarClass: "a4", name: "Anika Bhardwaj", email: "anika.bhardwaj@ust.com", role: "content", roleLabel: "Content Admin", iasGroups: ["ust-sap-content"], active: true, status: "active", lastActive: "Yesterday" },
  { id: "u_kb", initials: "KB", avatarClass: "a6", name: "Karan Bhatt", email: "karan.bhatt@ust.com", role: "viewer", roleLabel: "Viewer (pending)", iasGroups: ["ust-sap-gtm"], active: false, status: "awaiting", lastActive: "Yesterday" },
  { id: "u_dh", initials: "DH", avatarClass: "a7", name: "Deepa Hegde", email: "deepa.hegde@ust.com", role: "audit", roleLabel: "Auditor", iasGroups: ["ust-grc"], active: true, status: "active", lastActive: "3d ago" },
];

export const usersTotal = 412;

// ─── Snippets ──────────────────────────────────────────────────────────
export const snippets: Snippet[] = [
  { id: "snp_sapphire", type: "CTA", name: "SAPPHIRE Edition CTA", description: "Dark teal CTA with primary + secondary action. Pinned to SAPPHIRE campaign through June 14.", usedOn: 3, variant: "dark", lastEdited: { who: "JP", when: "2h" } },
  { id: "snp_footer", type: "Footer", name: "Global footer", description: "4-column footer with quick-links, brand, legal links and meta row. Auto-updates copyright year.", usedOn: 11, variant: "light", lastEdited: { who: "MJ", when: "5d" } },
  { id: "snp_maint", type: "Banner", name: "Maintenance banner", description: "Dismissible amber banner with scheduled visibility window. Targets Ops + Developers lanes.", usedOn: 1, variant: "light", lastEdited: { who: "AB", when: "8d" } },
  { id: "snp_noend", type: "Legal", name: "No-endorsement notice", description: "Approved positioning paragraph. Required on every capability page.", usedOn: 9, variant: "light", lastEdited: { who: "Legal", when: "6w" } },
  { id: "snp_contact", type: "CTA", name: "Talk to UST SAP team", description: "Lightweight CTA card linking to the contact route. Used in capability page sidebars.", usedOn: 5, variant: "light", lastEdited: { who: "JP", when: "12d" } },
  { id: "snp_demo", type: "Disclaimer", name: "Demo data notice", description: "Inline disclaimer reminding viewers that demo data is illustrative. Auto-injected on demo-status capability pages.", usedOn: 4, variant: "light", lastEdited: { who: "MJ", when: "4w" } },
];

// ─── Schedule events (June 2026) ───────────────────────────────────────
export const scheduleEvents: ScheduleEvent[] = [
  { date: "2026-06-05", kind: "draft", title: "Draft v48 saved" },
  { date: "2026-06-09", kind: "pub", title: "SAPPHIRE CTA · 09:00", time: "09:00 ET", detail: "Approved by Mohamed J. · auto-fires on schedule" },
  { date: "2026-06-14", kind: "unpub", title: "SAPPHIRE CTA · 23:59", time: "23:59 ET", detail: "Paired with the Mon publish · same approval" },
  { date: "2026-06-22", kind: "exp", title: "Webhook secret expires", time: "00:00 UTC", detail: "Plan rotation · creates an approval" },
  { date: "2026-06-28", kind: "pub", title: "CX Insurance · v3.2", time: "11:00 ET", detail: "Awaiting approver assignment" },
];

// ─── Approvals ─────────────────────────────────────────────────────────
export const approvals: Approval[] = [
  {
    id: "A-0048", kind: "publish", kindLabel: "Publish",
    title: "Landing page v48 → Production",
    requester: { initials: "JP", avatarClass: "a1", name: "John P." },
    approver: { name: "Mohamed J.", ooo: true },
    slaState: "past-sla", slaLabel: "Past SLA · 4h",
    detail: "Diff 4 hero edits · 1 tile reorder",
    justification: "Updates Q3 messaging to align with SAPPHIRE narrative and corrects the deep-link template for RIA. Soft-launch Friday.",
    createdAt: "4h ago",
    comments: [
      { who: { initials: "JP", avatarClass: "a1", name: "John P." }, ts: "4h ago", body: "Updates Q3 messaging to align with SAPPHIRE narrative and corrects the deep-link template for RIA. Soft-launch Friday." },
      { who: { initials: "⚙", avatarClass: "a5", name: "System" }, ts: "2h ago", system: true, body: "Primary approver Mohamed J. is on PTO (returns Mon). Delegation rule SAPPHIRE-launch routed to John P. — but John is the requester. Re-routed to Super Admin queue with 2h SLA buffer." },
      { who: { initials: "AB", avatarClass: "a4", name: "Anika B.", roleLabel: "Content Admin" }, ts: "1h ago", body: "Reviewed the hero edits — copy passes Legal review (pending Mohamed's sign-off). The RIA route fix matches the manifest at /.well-known/suiteplus-capability.json (verified)." },
    ],
  },
  {
    id: "A-0047", kind: "role-grant", kindLabel: "Role grant",
    title: "Capability Owner on CX for Life Sciences",
    requester: { initials: "PS", avatarClass: "a5", name: "Priya S." },
    slaState: "past-sla", slaLabel: "Past SLA · 1h",
    detail: "Target ust-cx-ls-leads (6 members) · Scope capability:cx-life-sciences:configure",
    createdAt: "1h past SLA",
    comments: [],
  },
  {
    id: "A-0046", kind: "integration", kindLabel: "Integration",
    title: "Bind Destination · signavio-prod",
    requester: { initials: "RK", avatarClass: "a2", name: "Rakesh K." },
    slaState: "sla", slaLabel: "SLA · 22h",
    detail: "BTP Destination signavio-prod (mTLS)",
    createdAt: "4h ago",
    comments: [],
  },
];

// ─── Audit events ──────────────────────────────────────────────────────
export const auditEvents: AuditEvent[] = [
  {
    id: "e_a042", ts: "14:32:08", dateLabel: "2026-06-05",
    who: { initials: "MJ", avatarClass: "a3", name: "Mohamed J." },
    verb: "published", desc: "landing-page revision v47",
    detail: "via approval #A-0042 · diff 6 blocks · bundle 7a4e…",
    tags: ["info", "content.published"], severity: "info", category: "content",
  },
  {
    id: "e_a040", ts: "13:48:54", dateLabel: "2026-06-05",
    who: { initials: "PS", avatarClass: "a3", name: "Priya S." },
    verb: "granted", desc: "role Capability Owner on RIA to group ust-ria-leads",
    detail: "step-up MFA · dual-controlled · approver: John P.",
    tags: ["warn", "role.granted"], severity: "warn", category: "authz",
    expandedJson: {
      event_id: "e_01HKXX…0042",
      ts: "2026-06-05T13:48:54.214Z",
      actor_id: "u_priya.sharma@ust.com",
      actor_role: "Suite Admin",
      source_ip: "10.42.16.88",
      action: "role.granted",
      resource_type: "role_mapping",
      resource_id: "rm_ria-leads_cap-owner",
      before_hash: "sha256:f3a9…",
      after_hash: "sha256:91c2…",
      approval_id: "a_0040",
      outcome: "success",
    },
  },
  {
    id: "e_int", ts: "12:21:09", dateLabel: "2026-06-05",
    who: { initials: "RK", avatarClass: "a2", name: "Rakesh K." },
    verb: "configured", desc: "Destination flexiom-prod",
    detail: "dual-controlled · approver: John P. · cert rotated",
    tags: ["warn", "integration.configured"], severity: "warn", category: "integration",
  },
  {
    id: "e_sec", ts: "10:04:11", dateLabel: "2026-06-05",
    who: { initials: "AB", avatarClass: "a4", name: "Anika B." },
    verb: "rotated", desc: "webhook secret · scope tile.published",
    detail: "scheduled rotation · BTP Credential Store · TTL 90d",
    tags: ["info", "secret.rotated"], severity: "info", category: "secret",
  },
  {
    id: "e_drf", ts: "09:14:38", dateLabel: "2026-06-05",
    who: { initials: "JP", avatarClass: "a1", name: "John P." },
    verb: "created", desc: "draft revision v48",
    detail: "3 hero edits · 1 tile reorder",
    tags: ["info", "draft.created"], severity: "info", category: "draft",
  },
  {
    id: "e_den", ts: "02:31:04", dateLabel: "2026-06-05",
    who: { initials: "SYS", avatarClass: "a7", name: "System" },
    verb: "denied", desc: "login for unknown@external.com",
    detail: "no IAS match · source IP 188.66.x.x · 5th attempt · rate-limited",
    tags: ["critical", "authn.denied"], severity: "crit", category: "authz",
  },
  {
    id: "e_scim", ts: "Yesterday", dateLabel: "2026-06-04",
    who: { initials: "SCIM", avatarClass: "a5", name: "SAP IPS" },
    verb: "synced", desc: "412 users · 7 groups",
    detail: "nightly · 3 deactivations · 0 new",
    tags: ["info", "scim.sync"], severity: "info", category: "scim",
  },
];

// ─── Redirects ─────────────────────────────────────────────────────────
export const redirects: Redirect[] = [
  { source: "/ria/assessment", target: "/capability/ria/assessment", type: "301", hits7d: 286, lastHit: "2m ago" },
  { source: "/sapphire-2026", target: "/?utm_source=sapphire&lane=industry", type: "302", hits7d: 62, lastHit: "14m ago" },
  { source: "/old-tpo", target: "/capability/trade-promotion-optimizer", type: "301", hits7d: 34, lastHit: "1h ago" },
  { source: "/flexiom-launch", target: "/capability/flexiom", type: "301", hits7d: 18, lastHit: "3h ago" },
  { source: "/cx-ls-demo", target: "/capability/cx-life-sciences?mode=demo", type: "302", hits7d: 9, lastHit: "Yesterday" },
  { source: "/ria-legacy/*", target: "/capability/ria/$1", type: "301 (regex)", hits7d: 3, lastHit: "2d ago" },
];

// ─── SCIM errors ───────────────────────────────────────────────────────
export const scimActiveError: ScimError = {
  id: "A001", active: true, ts: "since 06:08 today",
  title: "Duplicate externalId on group ust-fin-leads",
  body: "Two IPS records claim externalId grp_a72f… — one synced from AD, one manually created in IAS in 2024. SCIM 2.0 cannot resolve the conflict automatically.",
  impact: "6 users in ust-fin-leads may be missing or duplicated. Role ROI Calculator · Capability Owner may not resolve correctly until the conflict is cleared.",
  fix: "Archive the orphan IAS-created group and re-trigger a delta sync. Suite+ will reconcile role mappings automatically.",
  payload: {
    schemas: '["urn:ietf:params:scim:schemas:core:2.0:Group"]',
    externalId: '"grp_a72f4b9c8e9"',
    displayName: '"ust-fin-leads"',
    members: "[ … 6 ]",
    meta_resourceType: '"Group"',
    meta_created: '"2024-03-08T11:02:18Z"',
    meta_lastModified: '"2026-06-05T06:08:11Z"',
  },
};

export const scimResolved = [
  { ts: "11:42 today", desc: "External attribute missing · user karan.b@ust.com", detail: "Retried 1× with augmented schema · resolved", tag: "scim.user.fixed" },
  { ts: "04:01 today", desc: "Rate-limited by IPS · 30/30 requests · cooldown 60s", detail: "Auto-resumed · 0 records lost", tag: "scim.throttle" },
  { ts: "22:14 yesterday", desc: "Deactivation cascade · 2 users disabled in AD", detail: "SCIM marked them inactive · role mappings revoked", tag: "scim.user.deactivated" },
];

// ─── Composer blocks ───────────────────────────────────────────────────
export const composerBlocks: ComposerBlock[] = [
  { id: "b_hero", type: "hero", label: "Hero", subtitle: "Showcase canvas · animated", badges: ["vis"], fields: { eyebrow: "UST SAP capability showcase", headline: "UST AI Suite+ for SAP · SAPPHIRE Edition", subhead: "A modern portfolio of AI-enabled accelerators, SAP-focused solution assets, and practical business tools.", bgStyle: "Showcase canvas (dark teal)", accent: "ust-dark", animation: true, quickChips: true } },
  { id: "b_ovr", type: "overview", label: "Overview band", subtitle: "4 KPI cards", badges: [], fields: {} },
  { id: "b_lane", type: "lane-grid", label: "Lane grid", subtitle: "9 audience lanes", badges: [], fields: {} },
  { id: "b_cap", type: "capability-grid", label: "Capability grid", subtitle: "auto-bound to enabled tiles", badges: [], fields: {} },
  { id: "b_story", type: "story-strip", label: "Story strip", subtitle: "3 story cards", badges: ["sched"], fields: {} },
  { id: "b_cta", type: "snippet", label: "SAPPHIRE CTA", subtitle: "from Snippets · used in 3 pages", badges: ["snip"], fields: {} },
  { id: "b_foot", type: "footer", label: "Footer", subtitle: "from Snippets · global", badges: ["snip"], fields: {} },
];

// ─── Site Health KPIs ──────────────────────────────────────────────────
export const siteHealthKpis: SiteHealthKpi[] = [
  { label: "Tiles healthy", value: "6 / 8", trend: { tone: "up", text: "75% uptime" } },
  { label: "Broken deep-links", value: "3", trend: { tone: "danger", text: "Across 2 tiles" } },
  { label: "Manifest probes / hr", value: "96", trend: { tone: "up", text: "Every 7m" } },
  { label: "Avg p95 latency", value: "1.8s", trend: { tone: "up", text: "↓ 14% vs 7d" } },
];

// ─── Revision diff for Env Diff modal ──────────────────────────────────
export const revisionDiff: RevisionDiff = {
  draftLabel: "DRAFT v48",
  prodLabel: "PROD v47",
  lines: [
    { kind: "del", key: "hero.headline", value: '"UST AI Suite+ for SAP"' },
    { kind: "add", key: "hero.headline", value: '"UST AI Suite+ for SAP · SAPPHIRE Edition"' },
    { kind: "del", key: "tile[ria].deepLink", value: '"/assessment"' },
    { kind: "add", key: "tile[ria].deepLink", value: '"/assessment/{tenantId}"' },
    { kind: "del", key: "snippet[SAPPHIRE_CTA].schedule.start", value: "null" },
    { kind: "add", key: "snippet[SAPPHIRE_CTA].schedule.start", value: '"2026-06-09T13:00:00Z"' },
    { kind: "eq",  key: "tile.order", value: '["ria","cu","ra","roi","tpo","cx-ls","cx-ins","flexiom"]' },
  ],
};

// ─── Current user (mocked as JP) ───────────────────────────────────────
export const currentUser = { initials: "JP", name: "John Patrick", subtitle: "UST SAP GTM", roleLabel: "Suite Admin" };
