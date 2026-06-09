// Drizzle schema · SQLite locally, promotable to HANA via dialect swap.
// All JSON columns stored as TEXT — no SQLite-specific functions used.
import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const userAccount = sqliteTable("user_account", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const roleMapping = sqliteTable("role_mapping", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => userAccount.id),
  role: text("role", { enum: ["super_admin", "editor", "viewer"] }).notNull(),
  grantedAt: integer("granted_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => ({
  byUser: index("role_mapping_by_user").on(t.userId),
}));

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => userAccount.id),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => ({
  byExpires: index("session_by_expires").on(t.expiresAt),
}));

export const lane = sqliteTable("lane", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  audience: text("audience").notNull(),
  purpose: text("purpose").notNull(),
  tagsJson: text("tags_json").notNull().default("[]"),
  sortOrder: integer("sort_order").notNull(),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
});

export const capability = sqliteTable("capability", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  type: text("type").notNull(),
  status: text("status", { enum: ["live", "demo", "available"] }).notNull(),
  primaryLaneId: text("primary_lane_id").notNull().references(() => lane.id),
  secondaryLaneIdsJson: text("secondary_lane_ids_json").notNull().default("[]"),
  description: text("description").notNull(),
  featuresJson: text("features_json").notNull().default("[]"),
  searchKeywords: text("search_keywords").notNull().default(""),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull(),
});

export const tile = sqliteTable("tile", {
  id: text("id").primaryKey(),
  capabilityId: text("capability_id").notNull().references(() => capability.id),
  routeKind: text("route_kind", { enum: ["internal", "external", "soon"] }).notNull().default("internal"),
  routeTemplate: text("route_template").notNull(),
  externalUrl: text("external_url"),
  visibility: text("visibility", { enum: ["public", "role_gated"] }).notNull().default("public"),
  sortOrder: integer("sort_order").notNull(),
}, (t) => ({
  byCapability: uniqueIndex("tile_by_capability").on(t.capabilityId),
}));

export const pageBlock = sqliteTable("page_block", {
  id: text("id").primaryKey(),
  pageKey: text("page_key").notNull(),
  blockType: text("block_type").notNull(),
  label: text("label").notNull(),
  subtitle: text("subtitle"),
  position: integer("position").notNull(),
  fieldsJson: text("fields_json").notNull().default("{}"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
}, (t) => ({
  byPageOrder: index("page_block_by_page_order").on(t.pageKey, t.position),
}));

export const snippet = sqliteTable("snippet", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  bodyMd: text("body_md").notNull().default(""),
  variant: text("variant", { enum: ["light", "dark"] }).notNull().default("light"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const redirect = sqliteTable("redirect", {
  id: text("id").primaryKey(),
  fromPath: text("from_path").notNull().unique(),
  toPath: text("to_path").notNull(),
  statusCode: integer("status_code").notNull().default(301),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
});

export const seoDefault = sqliteTable("seo_default", {
  id: text("id").primaryKey(),
  scope: text("scope").notNull().unique(),
  titleTemplate: text("title_template").notNull(),
  description: text("description").notNull(),
  canonicalHost: text("canonical_host").notNull(),
  ogPayloadJson: text("og_payload_json").notNull().default("{}"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const configRevision = sqliteTable("config_revision", {
  id: text("id").primaryKey(),
  revisionNumber: integer("revision_number").notNull().unique(),
  bundleJson: text("bundle_json").notNull(),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }).notNull(),
  publishedBy: text("published_by").notNull().references(() => userAccount.id),
  notes: text("notes").default(""),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
}, (t) => ({
  byCurrent: index("config_revision_by_current").on(t.isCurrent),
}));

export const auditEvent = sqliteTable("audit_event", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id").references(() => userAccount.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
  requestId: text("request_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => ({
  byActorTime: index("audit_event_by_actor_time").on(t.actorUserId, t.createdAt),
  byEntity: index("audit_event_by_entity").on(t.entityType, t.entityId),
}));

// V0.8 · approval workflow
export const approval = sqliteTable("approval", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["publish", "role_grant", "integration", "secret_rotation"] }).notNull(),
  title: text("title").notNull(),
  detail: text("detail"),
  justification: text("justification"),
  payloadJson: text("payload_json").notNull().default("{}"),
  requesterId: text("requester_id").notNull().references(() => userAccount.id),
  approverId: text("approver_id").references(() => userAccount.id),
  state: text("state", { enum: ["pending", "approved", "rejected", "withdrawn", "executed"] }).notNull(),
  stateNotes: text("state_notes"),
  slaDueAt: integer("sla_due_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
  executedAt: integer("executed_at", { mode: "timestamp_ms" }),
}, (t) => ({
  byState: index("approval_by_state").on(t.state),
  byRequester: index("approval_by_requester").on(t.requesterId),
}));
