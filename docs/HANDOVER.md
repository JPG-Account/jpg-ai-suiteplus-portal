# Suite+ Admin · Session Handover

> **READ THIS FIRST.** This document is the source of truth for picking up
> where the previous session left off. It captures: what's been built, what
> was discovered, what's decided, what's open, and what to do next.
>
> **Last updated:** 2026-06-05 (end of V0.8 + BTP diagnostic session)
> **Project root:** `/Volumes/Galids-Toshiba1/Projects/UST AI Suite/`

---

## 1 · One-page status

### What we're building
**UST AI Suite+ for SAP** — a UST SAP capability portfolio. Two web apps + future backend services:

- **`apps/portal/`** (port 3010) · public-facing showcase consumed by sellers/clients · Next.js 14 · vanilla CSS · UST teal+black design
- **`apps/admin/`** (port 3011) · non-developer admin to configure the portal end-to-end · same stack + SQLite/Postgres backend + auth + approval engine

The portal is a thin renderer over a config bundle. The admin owns the bundle (in DB), publishes immutable revisions, and fires a webhook so the portal hot-reloads within seconds.

### Where we are RIGHT NOW
- **V0.8 shipped, running locally.** Both servers up; portal at `:3010`, admin at `:3011`.
- **V0.9-Crawl planned, awaiting JP's go.** Specific design done (see §6).
- **BTP diagnostics complete** — actual CF org, available services, Postgres situation, domain options all confirmed (see §5).
- **JP's UST email confirmed: `johnpatrick.galido@ust.com`** (NOT `@ust-global.com`, NOT `@gmail.com`).

### The four hard rules (non-negotiable per the Skill)
1. **Canonical UST repo only:** `https://github.com/UST-Account/SCMA-SAPR-SL-00_Rapid-Impact-Analyzer`
2. **Never name AI vendors** (Claude/Anthropic/OpenAI/GPT) anywhere UST-facing.
3. **Deploy ONLY to SAP BTP Cloud Foundry** (UST Global Inc · BUILD_AI_SUBACCOUNT · `code_migration_space`).
4. **History-scrubbed migrations**, JP-initiated, latest code only — no personal-repo `.git` import.

Skill location: `~/.claude/skills/ust-ai-suite-plus-sap/SKILL.md`

---

## 2 · Build-loop history (what shipped, when)

The portfolio doctrine build-loop: **Handover → Plan → Design → Eng → Validation → Deploy**. Critical/High in Phase 5 blocks Phase 6.

| Version | Scope | Status |
|---|---|---|
| **V0.0** | Portal mock (`source/v0-design.html`) + skill registered | ✓ |
| **V0.1** | Next.js portal scaffolded · all 17 sections, design fidelity | ✓ |
| **V0.2** | UST corporate mark in topbar · premium typography pass · animation | ✓ |
| **V0.3** | Hard rules baked into skill (canonical repo · no vendor names · BTP CF · history-scrubbed) | ✓ |
| **V0.4** | Portal BTP CF deploy artifacts (Dockerfile · manifest · GH Actions · runbook) | ✓ |
| **V0.5** | Admin design mock (5 screens) + 2-specialist critique | ✓ |
| **V0.6** | Admin mock revised to 12 screens + Env Diff modal | ✓ |
| **V0.7** | Backend wired: SQLite + Drizzle + auth + reads + writes + portal integration | ✓ Web Builder PASS |
| **V0.7.1** | 6 remaining screens wired to real APIs + rollback API + Revisions screen + Mediums fixed | ✓ Web Builder PASS |
| **V0.8** | Approvals engine (state machine + UI + audit + atomic execute) · Users/Health screens wired · 307/308 redirects · session_expired distinction · BTP CF deploy artifacts for admin · lazy DB init for BTP startup | ✓ Web Builder PASS |
| **V0.9-Crawl** | **Local password auth + invite flow + domain allow-list + Postgres adapter + bind to BTP** | ⏳ AWAITING JP'S GO |
| **V0.9-Walk** | IAS OIDC swap (entitled, self-serve) | Planned |
| **V1.0-Run** | Audit Log Service · Cloud ALM equivalent · IAS+MFA · IPS SCIM · HANA Cloud cutover | Planned |

### Phase 5 (Web Builder) outcomes across the build

- V0.7: PASS · 0 Critical/High · 3 Medium → became V0.7.1 scope
- V0.7.1: PASS · 0 Critical/High · 3 Medium + 1 controversial (notes required) → became V0.7.1-polish (knocked out)
- V0.8: PASS WITH FIXES · 0 Critical · 1 HIGH (`.ts` vs `.js` at boot) → **fixed in same session** via lazy DB init in `lib/db/ensure-db.ts`
- V0.9-Crawl: not yet validated

---

## 3 · Architecture (current state)

### Apps + ports

```
apps/portal/   Next.js 14 · TS · vanilla CSS · port 3010
apps/admin/    Next.js 14 · TS · vanilla CSS · port 3011 · SQLite (local)
```

### Data flow (today)

```
[admin UI] → PATCH /api/admin/{tiles,blocks,snippets,redirects,seo} → DB
[admin UI] → POST /api/admin/publish → new config_revision row, is_current=1
            → fires webhook POST {PORTAL}/api/revalidate?secret=...
[portal] → GET {ADMIN}/api/config/current with next.revalidate=60 → bundle
[portal] → renders Hero/Lanes/Capabilities from bundle
```

### Key abstractions (DO NOT BREAK)

| Abstraction | Why it matters |
|---|---|
| **`AuthProvider` interface** (`apps/admin/lib/auth/provider.ts`) | V0.9-Walk swaps `DevEmailAuthProvider` → `IASOidcAuthProvider` without touching route handlers. Already shipped: `DevEmailAuthProvider`. Coming: `LocalPasswordAuthProvider`. |
| **`config_revision` immutable rows + `is_current` pointer** | Atomic publish, atomic rollback, audit lineage. Never mutate a published revision. |
| **`withSuperAdmin` route guard** (`lib/auth/guard.ts`) | Single chokepoint for admin auth. Every write route uses it. |
| **`buildBundleFromDb()`** (`lib/bundle.ts`) | The single function that turns DB state into the portal-consumable JSON. Don't duplicate this logic. |
| **`writeAudit()`** (`lib/audit.ts`) | Every state-changing API call writes a row. Don't bypass. |
| **`ensureDbReady()`** (`lib/db/ensure-db.ts`) | Lazy schema + seed on first DB access. Makes BTP deploys boot-safe (no separate migrate step). |
| **`SESSION_COOKIE` constant** (`lib/auth/cookie-name.ts`) | Edge-safe import for middleware. Don't pull session.ts into middleware. |

### Schemas (DB tables)

12 tables in V0.8:
`user_account · role_mapping · session · lane · capability · tile · page_block · snippet · redirect · seo_default · config_revision · audit_event · approval`

Migration SQL: `apps/admin/lib/db/migrate-sql.ts` (CREATE TABLE IF NOT EXISTS pattern; safe to re-run)
Drizzle schema: `apps/admin/lib/db/schema.ts` (kept in sync by hand)

### API surface (V0.8)

**Public (no auth)**
- `GET /api/health` · `GET /api/config/current` · `POST /api/auth/sign-in` · `POST /api/auth/sign-out`

**Super Admin (cookie required)**
- `GET /api/auth/me`
- `GET /api/admin/lanes · capabilities · tiles · blocks · snippets · redirects · seo · revisions · audit · users`
- `PATCH /api/admin/{tiles, blocks, snippets, redirects, seo}`
- `POST /api/admin/blocks` (reorder)
- `POST/PATCH/DELETE /api/admin/redirects` (full CRUD)
- `POST /api/admin/publish` · `POST /api/admin/rollback`
- `GET /api/admin/draft/preview`
- `GET /api/admin/approvals · POST /api/admin/approvals · PATCH /api/admin/approvals/[id]`

### Files of record (most important)

```
apps/admin/
  .env.local                              ← SUPER_ADMIN_EMAIL · REVALIDATE_SECRET · PORTAL_BASE_URL
  data/suite-plus.sqlite                  ← local DB (gitignored)
  middleware.ts                           ← UI auth redirect (uses cookie-name.ts only)
  Dockerfile · manifest.yml               ← BTP CF deploy artifacts
  lib/
    db/{schema.ts, migrate-sql.ts, client.ts, ensure-db.ts}
    auth/{provider.ts, dev-email-provider.ts, session.ts, guard.ts, cookie-name.ts}
    audit.ts · bundle.ts
  app/
    layout.tsx · page.tsx (Action Dashboard)
    site/{composer, tiles, snippets, seo}/page.tsx
    schedule · health · preview-as · approvals (all wired or stubbed)
    access/{users, scim/errors}/page.tsx
    governance/{audit, revisions}/page.tsx
    sign-in/page.tsx
    api/auth/{sign-in, sign-out, me}/route.ts
    api/admin/{...} (see API surface above)
    api/config/current/route.ts            ← portal-facing
  components/
    Shell · Rail · TopBar · Icons · Toast · RollbackModal

apps/portal/
  .env.local                              ← ADMIN_BASE_URL · REVALIDATE_SECRET
  lib/registry.ts                         ← async getRegistry() fetches admin
  app/page.tsx                            ← server component, calls getRegistry()
  app/api/revalidate/route.ts             ← webhook receiver
  Dockerfile · manifest.yml · GH Actions  ← BTP CF deploy artifacts

docs/
  admin/
    SUITE_PLUS_ADMIN_PLAN.md              ← original plan + 13 architectural decisions
    BUILD_PLAN.md                         ← V0 build phasing
    PORTAL_TO_UST.md                      ← portal migration runbook
    ADMIN_TO_UST.md                       ← admin migration runbook
  migration/PORTAL_TO_UST.md
  HANDOVER.md                             ← this document

.github/workflows/
  portal-deploy.yml · admin-deploy.yml    ← BTP CF CI/CD

~/.claude/skills/ust-ai-suite-plus-sap/SKILL.md   ← portfolio skill governing all of this
```

---

## 4 · V0.8 — what landed last session

### New code
- Approval engine: `app/api/admin/approvals/route.ts` + `[id]/route.ts` (state machine: `pending → approved/rejected/withdrawn → executed`)
- Users API: `app/api/admin/users/route.ts`
- session_expired distinction: `app/api/auth/me/route.ts`
- Redirects 307/308: `app/api/admin/redirects/route.ts`
- Wired UI: Approvals Inbox, Users & Roles, Site Health (heuristic stub)
- Lazy DB init: `lib/db/ensure-db.ts` — first DB access auto-migrates + seeds

### Deploy artifacts (admin)
- `apps/admin/Dockerfile` · `manifest.yml` · `.dockerignore` · `.npmrc`
- `.github/workflows/admin-deploy.yml`
- `docs/admin/ADMIN_TO_UST.md`

### V0.8 demo flow (verified end-to-end)
1. Sign in as JP
2. Approvals Inbox → New approval → kind=publish, justification ≥ 10 chars
3. Approve (notes ≥ 5 chars) → state=`approved`
4. Execute (notes ≥ 5 chars) → state=`executed` + new revision published
5. Portal reflects within ~200 ms
6. Audit log shows: requested, approved, executed, publish

### Latencies measured
- Full approval cycle (request → execute → portal reflects): **301 ms**
- Concurrent 3-way approve race: **1×200, 2×409** (state machine is atomic)
- Users API: 31 ms warm

### V0.9 backlog filed
- `viewer` default role for unmapped users
- Dead heuristic branch in `/health` (read API always returns routeTemplate)
- `self_approved=true` audit flag (Web Builder's controversial ask)

---

## 5 · BTP environment FACTS (verified in cockpit + CLI)

This is the discovery from the diagnostic session. **Do not redo.**

### Global account · subaccount · org · space

| Level | Value |
|---|---|
| BTP Global Account | UST Global Inc |
| Subaccount | BUILD_AI_SUBACCOUNT |
| Subaccount subdomain | `build-ai-subaccount` |
| CF API | `https://api.cf.us10-001.hana.ondemand.com` |
| **CF Org name** | **`org-build-build-ai-subaccount`** (NOT "UST Global Inc" — that was in older docs) |
| CF Space | `code_migration_space` |
| Region | US East (VA) — AWS |

### Memory + apps in code_migration_space

- Org memory limit: **409,600 MB (~400 GB)**
- Available: **363.56 GB**
- Apps running:
  - `ust-rapid-impact` · 2 GB · 1 instance (RIA)
  - `btp-hello` · 128 MB · 1 instance (test app, ignorable)

Conclusion: memory is a non-issue. Admin (768 MB) + portal (512 MB) is rounding error.

### Postgres situation

One free instance exists, shared via Service Manager:
- Name: **`ust-portfolio-db`**
- Service: `postgresql-db`
- Plan: `free`
- Currently bound to: `ust-rapid-impact` (RIA)

The subaccount's `postgresql-db free` quota = **1**. That quota is consumed.

**Decision (locked in):** Admin + portal will share `ust-portfolio-db` via Postgres **schemas** — separate logical isolation, single instance:
- `ria` schema → RIA's existing data (untouched)
- `admin` schema → users, sessions, approvals, audit, config_revision (V0.9-Crawl-B target)
- `portal` schema → reserved (currently the portal is DB-less and reads HTTP)

Binding pattern:
```bash
cf bind-service ust-ai-suite-plus-sap-admin ust-portfolio-db
# In app, point Drizzle at the bound URL and set search_path=admin
```

### Domains

Only SAP-managed:
- `cfapps.us10-001.hana.ondemand.com` — public CF default
- `cert.cfapps.us10-001.hana.ondemand.com` — TLS cert-mapped variant
- `apps.internal` — **INTERNAL CF routing** (same-space apps reach each other without public TLS)

No UST custom domain exists. Custom subdomain = V1 ask of UST DNS team. For V0.9-Crawl-B:
- Public admin route: `ust-ai-suite-plus-sap-admin.cfapps.us10-001.hana.ondemand.com`
- Public portal route: `ust-ai-suite-plus-sap-portal.cfapps.us10-001.hana.ondemand.com`
- **Portal → admin internal:** `http://ust-ai-suite-plus-sap-admin.apps.internal:8080/api/config/current`

### Entitlements (66 total — relevant subset for V0.9/V1.0)

| Service | Plan | Quota | Used for | Status |
|---|---|---|---|---|
| `postgresql-db` | `free` | 1 | DB (currently RIA's; we share via schemas) | Consumed |
| `postgresql-db` | `standard` | unlimited | Paid Postgres if free is insufficient | Available |
| **`identity`** | **`application`** | **1** | **IAS OIDC for V0.9-Walk** | **Self-serve, NOT blocked on UST IT** |
| `sap-identity-services-onboarding` | `default` | 1 | Provision a new IAS tenant | Self-serve |
| `auditlog-api` | `default` | 1 | **BTP Audit Log Service for V1.0** | Self-serve |
| `auditlog-management` | `default` | 1 | Audit Log admin UI | Self-serve |
| `credstore` | `proxy` | 1 | BTP Credential Store (secrets) | Self-serve |
| `destination` | `lite` | 1 | BTP Destination Service (capability federation) | Self-serve |
| `connectivity` | `lite` | 1 | Cloud Connector for on-prem reachability | Self-serve |
| `application-logs` | `lite` | 1 | Centralized log search | Self-serve |
| `autoscaler` | `standard` | 1 | CPU/RPS-based auto-scaling | Self-serve |
| `feature-flags` | `lite` | 1 | Feature flag service for V1 | Self-serve |
| `feature-flags-dashboard` | `dashboard` | 1 | UI for above | Self-serve |
| `hana-cloud` | `hana-free` | 2 | HANA Cloud free tier for V1 endgame | Self-serve |
| `xsuaa` | `application` | 1 | OAuth/OIDC enforcement | Self-serve |

**Strategic implication:** Nothing in V0.9 or V1.0 is blocked on UST IT tickets. Every "tenant required" item is actually self-serve in this subaccount.

### Outdated facts to correct everywhere

If you see "Organization: UST Global Inc" in any old doc/comment/workflow, **that's the global account name, not the CF org**. The CF org is `org-build-build-ai-subaccount`. Manifests' top-of-file comments have been updated; GH Actions workflows still use a parameterized `CF_ORG` secret — that secret should be set to `org-build-build-ai-subaccount` in UST repo settings.

---

## 6 · V0.9-Crawl plan (ready to execute)

### Synthesized from 4 specialists (Solution · Backend · Security · BTP architects)

Each architect's full take is in the conversation transcript; here's the convergent plan.

### Scope · Crawl-A (local) + Crawl-B (BTP push)

**Crawl-A (local password auth):**
- Add `password_credential` table (1:1 with `user_account`, nullable)
- Add `auth_allowed_domain` table (seeded from env, admin can extend via UI)
- Add `password_reset_token` table (single-use, 72h TTL, SHA-256 hashed)
- Add columns to `user_account`: `status` (`invited|active|disabled`) · `invited_by` · `invited_at`
- New code: `lib/auth/local-password-provider.ts` · `lib/auth/password.ts` (scrypt via `node:crypto`) · `lib/auth/domain-allowlist.ts` · `lib/auth/csrf.ts` · optionally `lib/auth/totp.ts`
- New APIs: extended `/api/auth/sign-in` (now takes password) · `/api/auth/change-password` · `/api/auth/set-password` · `/api/admin/users/invite` · `/api/admin/users/[id]/reset` · `/api/admin/auth/domains` CRUD · optional `/api/auth/totp/enroll` + `/verify`
- New UI: `/sign-in` (password field + optional TOTP) · `/set-password?token=…` · `/admin/users` (invite + pending queue + revoke session) · `/admin/auth/domains` settings page
- Provider factory: `AUTH_PROVIDER=dev|local|ias` env var

**Crawl-B (Postgres adapter + BTP push):**
- Add `pg` adapter alongside `better-sqlite3` (Drizzle supports both)
- `DATABASE_DRIVER=sqlite|postgres` env switch
- Modify `ensure-db.ts` to create + use `admin` schema in `ust-portfolio-db`
- Mirror RIA's Postgres SSL fix (`SELF_SIGNED_CERT_IN_CHAIN` — get details from RIA's deploy logs or the `btp-cf-deploy` skill)
- `cf bind-service ust-ai-suite-plus-sap-admin ust-portfolio-db`
- Update `manifest.yml` to read `DATABASE_URL` from `VCAP_SERVICES`
- Re-push portal with `ADMIN_BASE_URL=http://ust-ai-suite-plus-sap-admin.apps.internal:8080`

### Convergent decisions (all 4 architects agreed)

| Decision | Rationale |
|---|---|
| Keep `AuthProvider` interface stable; add optional `setPasswordFromToken()` (no-op on IAS impl) | Walk swap = 1 PR change |
| **scrypt via `node:crypto`** (not argon2/bcrypt) | Zero new deps · Alpine-safe · no native rebuild |
| **No "forgot password" email flow** — admin issues reset links manually | Eliminates SMTP dependency |
| Invite tokens: 32-byte URL-safe, single-use, 72h TTL, stored as SHA-256 hash | Admin reveals URL once, out-of-band sharing (Teams) |
| Lockout: 5 fails / 15min window, lock 30min. Super Admin can unlock. | Standard pattern |
| CSRF double-submit token + strict CSP + HSTS + X-Frame-Options=DENY | Baseline hardening |
| Audit every auth event | Forensic readiness |
| Defer full Users CRUD UI; only invite + revoke + pending queue | Throwaway-code minimization (IPS owns lifecycle at Run) |

### Productive disagreements (calls already made)

| Topic | Decision | Why |
|---|---|---|
| MFA in Crawl? | **Optional TOTP toggle for Super Admin only** | High value, ~30 lines, blocks credential stuffing on most-privileged account |
| SQLite vs Postgres on BTP | **Two-step Crawl** — Crawl-A on SQLite locally, Crawl-B switches to Postgres before BTP push | SQLite in CF container = data loss on every restage; non-negotiable |
| User CRUD UI | **Don't build it**; only invite/pending/revoke | IPS owns this at Run |

### Email + identity facts

- **JP's UST email: `johnpatrick.galido@ust.com`** (`@ust.com` is the domain, not `@ust-global.com`)
- Domain allow-list for V0.9-Crawl: **`@ust.com`** (primary) · **`@ust-global.com`** (secondary, some UST entities use it)
- **No bypass list needed** — JP's email passes the domain check naturally
- Current state in DB (verified): `user_account.email = 'johnpatrick.galido@ust.com'`, role = `super_admin`

### Env vars for Crawl-A (JP sets in `.env.local`)
```
AUTH_PROVIDER=local
AUTH_PASSWORD_PEPPER=<generated 32-byte random>
AUTH_ALLOWED_DOMAINS=@ust.com,@ust-global.com
SESSION_TTL_HOURS=8
LOCKOUT_THRESHOLD=5
LOCKOUT_WINDOW_MIN=15
LOCKOUT_DURATION_MIN=30
TOTP_ENABLED_FOR_SUPER_ADMIN=true
```

### Env vars for Crawl-B (set via `cf set-env`)
```
NODE_ENV=production
AUTH_PROVIDER=local
DATABASE_DRIVER=postgres
DATABASE_SCHEMA=admin
AUTH_PASSWORD_PEPPER=<strong random>
AUTH_ALLOWED_DOMAINS=@ust.com,@ust-global.com
SESSION_TTL_HOURS=8
LOCKOUT_THRESHOLD=5
LOCKOUT_WINDOW_MIN=15
LOCKOUT_DURATION_MIN=30
TOTP_ENABLED_FOR_SUPER_ADMIN=true
SUPER_ADMIN_EMAIL=johnpatrick.galido@ust.com
SUPER_ADMIN_DISPLAY_NAME=John Patrick Galido
REVALIDATE_SECRET=<strong random>
PORTAL_BASE_URL=https://ust-ai-suite-plus-sap-portal.cfapps.us10-001.hana.ondemand.com
# DATABASE_URL auto-injected by CF from VCAP_SERVICES after cf bind-service
```

### Estimated effort
- Crawl-A: ~2 hours of build + Web Builder validation
- Crawl-B: ~2 hours of adapter + push + smoke
- Total: ~4 hours in one session

---

## 7 · Open decisions awaiting JP

When the next session starts, ask JP these two yes/nos (or accept his prior implicit defaults):

1. **TOTP for Super Admin in Crawl-A?** Default recommendation: **YES** (~30 lines, optional, blocks the worst stuffing scenarios)
2. **Scope this session?**
   - **A** = Crawl-A only (local password, no BTP push) — ~2 hrs
   - **A+B** = Crawl-A + Crawl-B (also bind Postgres + push admin to BTP) — ~4 hrs · default recommendation: **A+B** since BTP environment is fully scoped

If JP says "just go" or doesn't answer, default to **TOTP=Yes · A+B**.

---

## 8 · What the next session should do FIRST

1. **Read this handover** (you're doing it).
2. **Verify both apps are running** (portal :3010, admin :3011). If not, start them:
   ```bash
   cd "/Volumes/Galids-Toshiba1/Projects/UST AI Suite"
   pnpm --filter @ust/portal dev &
   pnpm --filter @ust/admin dev &
   ```
3. **Verify sign-in** with `johnpatrick.galido@ust.com` (no password yet — DevEmailAuthProvider).
4. **Ask JP** the two yes/nos above. Don't re-derive the plan — it's locked in §6.
5. **Execute** the plan. Schema additions first (in `migrate-sql.ts` + `ensure-db.ts`), then provider, then APIs, then UI, then `pnpm db:reset` to apply, then validation.
6. **Web Builder validates** after Crawl-A and again after Crawl-B.
7. **Fix any Critical/High** that surface.

---

## 9 · What the next session should NOT redo

Already decided · don't re-derive these:

- ❌ Don't re-deploy specialists for the V0.9 plan — they ran; their synthesis is in §6
- ❌ Don't re-discover BTP environment — facts are in §5
- ❌ Don't re-check JP's email — it's `johnpatrick.galido@ust.com`, in DB, in `.env.local`, in `ensure-db.ts`, in `seed.ts`
- ❌ Don't redesign approval engine — V0.8 shipped and passed Web Builder
- ❌ Don't rewrite the portal → admin integration — `lib/registry.ts` async `getRegistry()` works
- ❌ Don't reconsider Drizzle / better-sqlite3 — chosen, working, Postgres-promotable
- ❌ Don't reconsider scrypt vs argon2 — scrypt won (Alpine-safe, no native build)
- ❌ Don't build forgot-password email flow — admin reset only, per architects
- ❌ Don't build full Users CRUD UI — invite + revoke + pending queue only
- ❌ Don't bypass the hard rules

---

## 10 · Known gaps and V1.0 deferrals

These are deliberately not in V0.9-Crawl scope. File them for V0.9-Walk or V1.0.

| Item | Why deferred |
|---|---|
| Real IAS OIDC | V0.9-Walk · trivial swap once Crawl-A's `AuthProvider` is in place |
| IPS SCIM ingestion | V0.9-Walk or V1.0 |
| Role taxonomy beyond `super_admin` | V0.9-Walk |
| Per-capability ACL | V0.9-Walk |
| Real Preview-as-Role rendering on portal | V0.9-Walk |
| SCIM Sync Errors screen wired | V0.9-Walk |
| Schedule & Calendar runner | V0.9 or V1.0 |
| BTP Audit Log Service sidecar | V1.0 (self-serve, entitled) |
| Cloud ALM telemetry | V1.0 |
| Anomaly detection | V1.0 |
| API Management IP allow-list | V1.0 |
| Feature flags UI | V1.0 (entitled, self-serve) |
| YAML nightly export | V1.0 |
| Content types (News · Case Studies · Events) | V1.0 |
| Snippets used-on map / DAM replace-in-place | V1.0 |
| HANA Cloud cutover (from Postgres) | V1.0 (free tier entitled) |
| Custom UST domain | V1.0 (DNS team ask) |
| Web Builder's V0.8 mediums | Carry to V0.9 punchlist (default-`viewer` role · dead heuristic in /health · `self_approved` flag) |

---

## 11 · Critical environment notes

- **iCloud Drive sync issue** on JP's UST repo clone (`~/Library/Mobile Documents/com~apple~CloudDocs/Documents/GitHub/SCMA-SAPR-SL-00_Rapid-Impact-Analyzer/`). Flagged earlier — git repos in iCloud can corrupt `.git`. JP will move the clone out of iCloud after merge. Not blocking this session.
- **JP's CF login** is via `johnpatrick.galido@ust.com` (same email as Super Admin). Confirmed working via `cf login` in his terminal.
- **GitHub Actions secrets** for UST repo (must be set before admin deploy works):
  - `CF_API` = `https://api.cf.us10-001.hana.ondemand.com`
  - `CF_USERNAME` / `CF_PASSWORD` = service account with `code_migration_space` write access
  - `CF_ORG` = **`org-build-build-ai-subaccount`** (not "UST Global Inc")
  - `CF_SPACE` = `code_migration_space`
  - `ADMIN_SUPER_EMAIL` = `johnpatrick.galido@ust.com`
  - `ADMIN_REVALIDATE_SECRET` = same value as `REVALIDATE_SECRET` on portal
  - `ADMIN_PORTAL_BASE_URL` = `https://ust-ai-suite-plus-sap-portal.cfapps.us10-001.hana.ondemand.com`

---

## 12 · One-line summary for any cold start

> Building UST AI Suite+ for SAP. Portal + Admin + future RIA-as-capability. V0.8 admin shipped locally with approvals engine. V0.9-Crawl (local password auth + Postgres adapter + BTP push) is planned and ready to execute. Awaiting JP's two yes/nos: TOTP? Scope (A or A+B)? Default: TOTP=Yes, A+B. Everything else in §9.

---

**End of handover.** Pick up at §7 (open decisions) or §8 (first actions).
