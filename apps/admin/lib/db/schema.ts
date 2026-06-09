// Drizzle schema · Postgres (BTP Hyperscaler Postgres free plan in prod,
// local Docker Postgres for dev).
//
// JSON columns stored as TEXT (not JSONB) to keep existing JSON.parse/stringify
// call sites unchanged. Migrate to JSONB in a future revision if filtering or
// indexing into JSON becomes needed.
//
// Timestamps stored as bigint (millisecond epoch) to preserve the existing
// SQLite "integer with timestamp_ms mode" storage format. App code keeps
// using Date.now() / new Date(ms).
import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userAccount = pgTable("user_account", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const roleMapping = pgTable(
  "role_mapping",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => userAccount.id),
    role: text("role", { enum: ["super_admin", "editor", "viewer"] }).notNull(),
    grantedAt: bigint("granted_at", { mode: "number" }).notNull(),
  },
  (t) => ({
    byUser: index("role_mapping_by_user").on(t.userId),
  }),
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => userAccount.id),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    lastSeenAt: bigint("last_seen_at", { mode: "number" }).notNull(),
  },
  (t) => ({
    byExpires: index("session_by_expires").on(t.expiresAt),
  }),
);

export const lane = pgTable("lane", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  audience: text("audience").notNull(),
  purpose: text("purpose").notNull(),
  tagsJson: text("tags_json").notNull().default("[]"),
  sortOrder: integer("sort_order").notNull(),
  isArchived: boolean("is_archived").notNull().default(false),
});

export const capability = pgTable("capability", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  type: text("type").notNull(),
  status: text("status", { enum: ["live", "demo", "available"] }).notNull(),
  primaryLaneId: text("primary_lane_id")
    .notNull()
    .references(() => lane.id),
  secondaryLaneIdsJson: text("secondary_lane_ids_json").notNull().default("[]"),
  description: text("description").notNull(),
  featuresJson: text("features_json").notNull().default("[]"),
  searchKeywords: text("search_keywords").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull(),
});

export const tile = pgTable(
  "tile",
  {
    id: text("id").primaryKey(),
    capabilityId: text("capability_id")
      .notNull()
      .references(() => capability.id),
    routeKind: text("route_kind", { enum: ["internal", "external", "soon"] })
      .notNull()
      .default("internal"),
    routeTemplate: text("route_template").notNull(),
    externalUrl: text("external_url"),
    visibility: text("visibility", { enum: ["public", "role_gated"] })
      .notNull()
      .default("public"),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => ({
    byCapability: uniqueIndex("tile_by_capability").on(t.capabilityId),
  }),
);

export const pageBlock = pgTable(
  "page_block",
  {
    id: text("id").primaryKey(),
    pageKey: text("page_key").notNull(),
    blockType: text("block_type").notNull(),
    label: text("label").notNull(),
    subtitle: text("subtitle"),
    position: integer("position").notNull(),
    fieldsJson: text("fields_json").notNull().default("{}"),
    isEnabled: boolean("is_enabled").notNull().default(true),
  },
  (t) => ({
    byPageOrder: index("page_block_by_page_order").on(t.pageKey, t.position),
  }),
);

export const snippet = pgTable("snippet", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  bodyMd: text("body_md").notNull().default(""),
  variant: text("variant", { enum: ["light", "dark"] })
    .notNull()
    .default("light"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const redirect = pgTable("redirect", {
  id: text("id").primaryKey(),
  fromPath: text("from_path").notNull().unique(),
  toPath: text("to_path").notNull(),
  statusCode: integer("status_code").notNull().default(301),
  isEnabled: boolean("is_enabled").notNull().default(true),
});

export const seoDefault = pgTable("seo_default", {
  id: text("id").primaryKey(),
  scope: text("scope").notNull().unique(),
  titleTemplate: text("title_template").notNull(),
  description: text("description").notNull(),
  canonicalHost: text("canonical_host").notNull(),
  ogPayloadJson: text("og_payload_json").notNull().default("{}"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const configRevision = pgTable(
  "config_revision",
  {
    id: text("id").primaryKey(),
    revisionNumber: integer("revision_number").notNull().unique(),
    bundleJson: text("bundle_json").notNull(),
    publishedAt: bigint("published_at", { mode: "number" }).notNull(),
    publishedBy: text("published_by")
      .notNull()
      .references(() => userAccount.id),
    notes: text("notes").default(""),
    isCurrent: boolean("is_current").notNull().default(false),
  },
  (t) => ({
    byCurrent: index("config_revision_by_current").on(t.isCurrent),
  }),
);

export const auditEvent = pgTable(
  "audit_event",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").references(() => userAccount.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    beforeJson: text("before_json"),
    afterJson: text("after_json"),
    requestId: text("request_id"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => ({
    byActorTime: index("audit_event_by_actor_time").on(t.actorUserId, t.createdAt),
    byEntity: index("audit_event_by_entity").on(t.entityType, t.entityId),
  }),
);

// V0.8 · approval workflow
export const approval = pgTable(
  "approval",
  {
    id: text("id").primaryKey(),
    kind: text("kind", {
      enum: ["publish", "role_grant", "integration", "secret_rotation"],
    }).notNull(),
    title: text("title").notNull(),
    detail: text("detail"),
    justification: text("justification"),
    payloadJson: text("payload_json").notNull().default("{}"),
    requesterId: text("requester_id")
      .notNull()
      .references(() => userAccount.id),
    approverId: text("approver_id").references(() => userAccount.id),
    state: text("state", {
      enum: ["pending", "approved", "rejected", "withdrawn", "executed"],
    }).notNull(),
    stateNotes: text("state_notes"),
    slaDueAt: bigint("sla_due_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    decidedAt: bigint("decided_at", { mode: "number" }),
    executedAt: bigint("executed_at", { mode: "number" }),
  },
  (t) => ({
    byState: index("approval_by_state").on(t.state),
    byRequester: index("approval_by_requester").on(t.requesterId),
  }),
);
