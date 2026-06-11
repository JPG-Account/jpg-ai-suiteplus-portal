// Portal · config registry.
// Fetches the published bundle from the admin app's /api/config/current.
// Falls back to a baked snapshot if admin is unreachable (cold start, network, etc.).
//
// Wire: admin owns the data → portal pulls via HTTP with Next ISR (60s) + on-demand
// revalidate webhook on publish. The local SQLite is never touched from this side.

export type LaneName =
  | "AI for Executives"
  | "AI for Architects"
  | "AI for Business"
  | "AI for Consultants"
  | "AI for Developers"
  | "AI for Ops"
  | "AI for Governance"
  | "AI for Finance"
  | "AI for Industry / Domain";

export type SolutionStatus = "live" | "demo" | "available";

export type Solution = {
  id: string;
  name: string;
  shortName?: string;
  type: string;
  status: SolutionStatus;
  primaryLane: LaneName;
  secondaryLanes: LaneName[];
  description: string;
  features: string[];
  searchKeywords: string;
  enabled: boolean;
  route?: string;
  routeKind?: "internal" | "external" | "soon";
};

export type Lane = {
  id: string;
  name: LaneName;
  audience: string;
  purpose: string;
  tags: string[];
};

export type HeroBlockFields = {
  eyebrow?: string;
  headline?: string;
  subhead?: string;
};

export type ConfigBundle = {
  revision: number;
  publishedAt: string;
  solutions: Solution[];
  lanes: Lane[];
  hero: HeroBlockFields;
};

export const statusBadgeLabel: Record<SolutionStatus, string> = {
  live: "Live",
  demo: "Demo",
  available: "Available",
};

// ─── Fallback bundle (kept tiny — only the data the page MUST render) ───
const FALLBACK_BUNDLE: ConfigBundle = {
  revision: 0,
  publishedAt: new Date(0).toISOString(),
  lanes: [
    { id: "executives", name: "AI for Executives", audience: "CIO, CFO, COO, transformation leaders", purpose: "Decision visibility, value, risk, and prioritization.", tags: ["ROI Calculator", "Rapid Assessment"] },
    { id: "architects", name: "AI for Architects", audience: "Enterprise, solution, integration, data architects", purpose: "Architecture impact, modernization options, and standards alignment.", tags: ["RIA", "Rapid Assessment"] },
    { id: "business", name: "AI for Business", audience: "Process owners, operations leaders, super users", purpose: "Business process improvement and day-to-day decision support.", tags: ["FlexIOM", "Trade Promotion Optimizer"] },
    { id: "consultants", name: "AI for Consultants", audience: "Functional consultants, PMO, BAs, SMEs", purpose: "Faster analysis, workshops, documentation, and delivery outputs.", tags: ["Rapid Assessment", "RIA"] },
    { id: "developers", name: "AI for Developers", audience: "Developers, technical leads, QA", purpose: "Code, test, transport, object, and release quality.", tags: ["RIA", "Impact analysis"] },
    { id: "ops", name: "AI for Ops", audience: "AMS, ITSM, support, service owners", purpose: "Reduce recurring work, improve support quality, and enable users.", tags: ["Client University", "RIA"] },
    { id: "governance", name: "AI for Governance", audience: "Risk, compliance, audit, security", purpose: "Better control, evidence, and policy adherence.", tags: ["RIA", "Rapid Assessment"] },
    { id: "finance", name: "AI for Finance", audience: "CFO, finance operations, value office", purpose: "Business case, cost, and value tracking.", tags: ["ROI Calculator", "Trade Promotion Optimizer"] },
    { id: "industry", name: "AI for Industry / Domain", audience: "Industry leaders and domain specialists", purpose: "Industry-focused accelerators and solution stories by sector.", tags: ["CX for Life Sciences", "CX for Insurance", "Trade Promotion Optimizer"] },
  ],
  solutions: [],
  hero: {
    eyebrow: "UST SAP capability showcase",
    headline: "UST AI Suite+ for SAP",
    subhead: "A modern portfolio of AI-enabled accelerators, SAP-focused solution assets, and practical business tools that help clients assess faster, decide with confidence, improve operations, and move transformation work forward.",
  },
};

// ─── Live fetch ─────────────────────────────────────────────────────────
const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? "http://localhost:3011";

type AdminResponse = {
  revision: number;
  publishedAt: string;
  bundle: {
    lanes: any[];
    solutions: any[];
    blocks: Array<{ type: string; fields: Record<string, unknown> }>;
  };
};

function laneIdFromName(name: string): LaneName["valueOf"] extends string ? LaneName : LaneName {
  // pass-through: incoming admin name IS a LaneName.
  return name as unknown as LaneName;
}

function adaptBundle(raw: AdminResponse): ConfigBundle {
  const lanes: Lane[] = raw.bundle.lanes.map((l) => ({
    id: l.id,
    name: l.name as LaneName,
    audience: l.audience,
    purpose: l.purpose,
    tags: l.tags ?? [],
  }));
  const solutions: Solution[] = raw.bundle.solutions.map((s) => ({
    id: s.id,
    name: s.name,
    shortName: s.shortName,
    type: s.type,
    status: s.status,
    primaryLane: laneIdFromName(s.primaryLane),
    secondaryLanes: (s.secondaryLanes ?? []).map((n: string) => laneIdFromName(n)),
    description: s.description,
    features: s.features ?? [],
    searchKeywords: s.searchKeywords ?? "",
    enabled: !!s.enabled,
    route: s.route ?? undefined,
    routeKind: s.routeKind ?? "internal",
  }));
  const heroBlock = raw.bundle.blocks?.find((b) => b.type === "hero");
  const hero: HeroBlockFields = (heroBlock?.fields as HeroBlockFields) ?? FALLBACK_BUNDLE.hero;
  return {
    revision: raw.revision,
    publishedAt: raw.publishedAt,
    lanes,
    solutions,
    hero,
  };
}

export async function getRegistry(opts?: { mode?: "published" | "draft" }): Promise<ConfigBundle> {
  const mode = opts?.mode ?? "published";
  try {
    let res: Response;
    if (mode === "draft") {
      const secret = process.env.REVALIDATE_SECRET ?? "";
      res = await fetch(`${ADMIN_BASE_URL}/api/preview/draft?secret=${encodeURIComponent(secret)}`, {
        cache: "no-store",
      });
    } else {
      res = await fetch(`${ADMIN_BASE_URL}/api/config/current`, {
        next: { revalidate: 60, tags: ["suite-config"] },
      });
    }
    if (!res.ok) return FALLBACK_BUNDLE;
    const raw = (await res.json()) as AdminResponse;
    return adaptBundle(raw);
  } catch {
    return FALLBACK_BUNDLE;
  }
}
