// ─── Shared admin types ──────────────────────────────────────────────

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

export type RoleKey =
  | "super"
  | "suite"
  | "content"
  | "approve"
  | "cap"
  | "audit"
  | "viewer";

export type CapabilityStatus = "live" | "demo" | "available" | "danger";

export type HealthStatus = "healthy" | "slow" | "down";

export type Capability = {
  id: string;
  name: string;
  subtitle: string;
  lanes: LaneName[];
  routeTemplate: string;
  status: CapabilityStatus;
  visibility: "public" | "role-gated";
  health: HealthStatus;
  destinationName: string;
  p95: string;
  lastGood: string;
  lastEdited: { who: string; when: string };
};

export type User = {
  id: string;
  initials: string;
  avatarClass: string;
  name: string;
  email: string;
  role: RoleKey;
  roleLabel: string;
  iasGroups: string[];
  active: boolean;
  status: "active" | "awaiting" | "inactive";
  lastActive: string;
};

export type Snippet = {
  id: string;
  type: "CTA" | "Footer" | "Banner" | "Legal" | "Disclaimer";
  name: string;
  description: string;
  usedOn: number;
  variant: "light" | "dark";
  lastEdited: { who: string; when: string };
};

export type ScheduleEvent = {
  date: string;       // ISO date
  kind: "pub" | "unpub" | "exp" | "draft";
  title: string;
  detail?: string;
  time?: string;
};

export type ApprovalKind = "publish" | "role-grant" | "integration" | "access";

export type Approval = {
  id: string;
  kind: ApprovalKind;
  kindLabel: string;
  title: string;
  requester: { initials: string; avatarClass: string; name: string };
  approver?: { name: string; ooo?: boolean };
  slaState: "past-sla" | "sla" | "ok";
  slaLabel: string;
  detail: string;
  justification?: string;
  createdAt: string;
  comments: ApprovalComment[];
  diffPreview?: { added: string[]; removed: string[] };
};

export type ApprovalComment = {
  who: { initials: string; avatarClass: string; name: string; roleLabel?: string };
  ts: string;
  body: string;
  system?: boolean;
};

export type AuditEvent = {
  id: string;
  ts: string;
  dateLabel: string;
  who: { initials: string; avatarClass: string; name: string };
  verb: string;
  desc: string;
  detail?: string;
  tags: string[];
  severity: "info" | "warn" | "crit";
  category: "authz" | "content" | "integration" | "secret" | "approval" | "scim" | "draft";
  expandedJson?: Record<string, string>;
};

export type Redirect = {
  source: string;
  target: string;
  type: "301" | "302" | "301 (regex)";
  hits7d: number;
  lastHit: string;
};

export type ScimError = {
  id: string;
  active: boolean;
  ts: string;
  title: string;
  body: string;
  impact: string;
  fix: string;
  payload: Record<string, string>;
};

export type ComposerBlock = {
  id: string;
  type: "hero" | "overview" | "lane-grid" | "capability-grid" | "story-strip" | "snippet" | "cta" | "footer";
  label: string;
  subtitle: string;
  badges: ("snip" | "sched" | "vis")[];
  fields: {
    eyebrow?: string;
    headline?: string;
    subhead?: string;
    bgStyle?: string;
    accent?: string;
    animation?: boolean;
    quickChips?: boolean;
  };
};

export type SiteHealthKpi = {
  label: string;
  value: string;
  trend: { tone: "up" | "flat" | "danger"; text: string };
};

export type RevisionDiff = {
  draftLabel: string;     // "DRAFT v48"
  prodLabel: string;      // "PROD v47"
  lines: { kind: "add" | "del" | "eq"; key: string; value: string }[];
};
