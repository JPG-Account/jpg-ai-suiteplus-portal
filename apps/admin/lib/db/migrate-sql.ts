// Inline migration SQL — applied at boot via ensure-db.ts.
// Postgres dialect. Idempotent: every CREATE uses IF NOT EXISTS.
//
// Column-type conventions:
//   - id              → TEXT (UUIDs / hand-crafted slugs)
//   - timestamps      → BIGINT (millisecond epoch; matches Date.now())
//   - boolean flags   → BOOLEAN
//   - counters/order  → INTEGER
//   - hashed secrets  → BYTEA
//   - JSON columns    → TEXT (stringified; not JSONB — keeps existing
//                       JSON.parse/stringify call sites unchanged)
export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS user_account (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  created_at    BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_mapping (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES user_account(id),
  role        TEXT NOT NULL CHECK (role IN ('super_admin','editor','viewer')),
  granted_at  BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS role_mapping_by_user ON role_mapping(user_id);

CREATE TABLE IF NOT EXISTS session (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES user_account(id),
  expires_at    BIGINT NOT NULL,
  created_at    BIGINT NOT NULL,
  last_seen_at  BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS session_by_expires ON session(expires_at);

CREATE TABLE IF NOT EXISTS lane (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  audience    TEXT NOT NULL,
  purpose     TEXT NOT NULL,
  tags_json   TEXT NOT NULL DEFAULT '[]',
  sort_order  INTEGER NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS capability (
  id                       TEXT PRIMARY KEY,
  slug                     TEXT NOT NULL UNIQUE,
  name                     TEXT NOT NULL,
  short_name               TEXT,
  type                     TEXT NOT NULL,
  status                   TEXT NOT NULL CHECK (status IN ('live','demo','available')),
  primary_lane_id          TEXT NOT NULL REFERENCES lane(id),
  secondary_lane_ids_json  TEXT NOT NULL DEFAULT '[]',
  description              TEXT NOT NULL,
  features_json            TEXT NOT NULL DEFAULT '[]',
  search_keywords          TEXT NOT NULL DEFAULT '',
  enabled                  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order               INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tile (
  id              TEXT PRIMARY KEY,
  capability_id   TEXT NOT NULL REFERENCES capability(id),
  route_kind      TEXT NOT NULL DEFAULT 'internal' CHECK (route_kind IN ('internal','external','soon')),
  route_template  TEXT NOT NULL,
  external_url    TEXT,
  visibility      TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','role_gated')),
  sort_order      INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tile_by_capability ON tile(capability_id);

CREATE TABLE IF NOT EXISTS page_block (
  id           TEXT PRIMARY KEY,
  page_key     TEXT NOT NULL,
  block_type   TEXT NOT NULL,
  label        TEXT NOT NULL,
  subtitle     TEXT,
  position     INTEGER NOT NULL,
  fields_json  TEXT NOT NULL DEFAULT '{}',
  is_enabled   BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS page_block_by_page_order ON page_block(page_key, position);

CREATE TABLE IF NOT EXISTS snippet (
  id           TEXT PRIMARY KEY,
  key          TEXT NOT NULL UNIQUE,
  type         TEXT NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  body_md      TEXT NOT NULL DEFAULT '',
  variant      TEXT NOT NULL DEFAULT 'light' CHECK (variant IN ('light','dark')),
  updated_at   BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS redirect (
  id           TEXT PRIMARY KEY,
  from_path    TEXT NOT NULL UNIQUE,
  to_path      TEXT NOT NULL,
  status_code  INTEGER NOT NULL DEFAULT 301,
  is_enabled   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS seo_default (
  id              TEXT PRIMARY KEY,
  scope           TEXT NOT NULL UNIQUE,
  title_template  TEXT NOT NULL,
  description     TEXT NOT NULL,
  canonical_host  TEXT NOT NULL,
  og_payload_json TEXT NOT NULL DEFAULT '{}',
  updated_at      BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS config_revision (
  id               TEXT PRIMARY KEY,
  revision_number  INTEGER NOT NULL UNIQUE,
  bundle_json      TEXT NOT NULL,
  published_at     BIGINT NOT NULL,
  published_by     TEXT NOT NULL REFERENCES user_account(id),
  notes            TEXT DEFAULT '',
  is_current       BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS config_revision_by_current ON config_revision(is_current);

CREATE TABLE IF NOT EXISTS audit_event (
  id              TEXT PRIMARY KEY,
  actor_user_id   TEXT REFERENCES user_account(id),
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       TEXT,
  before_json     TEXT,
  after_json      TEXT,
  request_id      TEXT,
  created_at      BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_event_by_actor_time ON audit_event(actor_user_id, created_at);
CREATE INDEX IF NOT EXISTS audit_event_by_entity ON audit_event(entity_type, entity_id);

-- V0.9-Crawl-A · local password auth
-- user_account column additions handled in ensure-db.ts via ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
CREATE TABLE IF NOT EXISTS password_credential (
  user_id          TEXT PRIMARY KEY REFERENCES user_account(id) ON DELETE CASCADE,
  algo             TEXT NOT NULL DEFAULT 'scrypt',
  salt             BYTEA NOT NULL,
  hash             BYTEA NOT NULL,
  params_json      TEXT NOT NULL,
  must_rotate      BOOLEAN NOT NULL DEFAULT FALSE,
  failed_attempts  INTEGER NOT NULL DEFAULT 0,
  locked_until     BIGINT,
  last_changed_at  BIGINT NOT NULL,
  created_at       BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_allowed_domain (
  pattern    TEXT PRIMARY KEY,
  is_glob    BOOLEAN NOT NULL DEFAULT FALSE,
  added_by   TEXT REFERENCES user_account(id),
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_reset_token (
  token_hash   TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
  expires_at   BIGINT NOT NULL,
  consumed_at  BIGINT,
  created_at   BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS prt_by_user ON password_reset_token(user_id);

CREATE TABLE IF NOT EXISTS totp_secret (
  user_id        TEXT PRIMARY KEY REFERENCES user_account(id) ON DELETE CASCADE,
  secret_base32  TEXT NOT NULL,
  verified       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     BIGINT NOT NULL
);

-- V0.8 · approvals
CREATE TABLE IF NOT EXISTS approval (
  id              TEXT PRIMARY KEY,
  kind            TEXT NOT NULL CHECK (kind IN ('publish','role_grant','integration','secret_rotation')),
  title           TEXT NOT NULL,
  detail          TEXT,
  justification   TEXT,
  payload_json    TEXT NOT NULL DEFAULT '{}',
  requester_id    TEXT NOT NULL REFERENCES user_account(id),
  approver_id     TEXT REFERENCES user_account(id),
  state           TEXT NOT NULL CHECK (state IN ('pending','approved','rejected','withdrawn','executed')),
  state_notes     TEXT,
  sla_due_at      BIGINT,
  created_at      BIGINT NOT NULL,
  decided_at      BIGINT,
  executed_at     BIGINT
);
CREATE INDEX IF NOT EXISTS approval_by_state ON approval(state);
CREATE INDEX IF NOT EXISTS approval_by_requester ON approval(requester_id);
`;
