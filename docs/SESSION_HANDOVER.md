# Session Handover — Day 1 Complete

> Detailed state of the migration as of end of Day 1 (2026-06-08, evening).
> Read this first when resuming. ~5 min read.

---

## 0. The 30-second TL;DR

**Today, we migrated JP's existing portal + admin code from `/Volumes/Galids-Toshiba1/Projects/UST AI Suite/` into a fresh GitHub repo (`JPG-Account/jpg-ai-suiteplus-portal`, private) AND rewrote the entire admin from SQLite to async Postgres. 14 clean commits. `tsc --noEmit` clean. Ready for local Docker Postgres smoke test (Step 4.7) next session, then BTP deploy.**

**Day 30 target: 2026-07-08 (UST exec demo).** Plenty of buffer.

---

## 1. Where the code lives

| Asset | Path |
|---|---|
| **GitHub repo (truth)** | `https://github.com/JPG-Account/jpg-ai-suiteplus-portal` (PRIVATE) |
| **Local working tree** | `~/Projects/jpg-ai-suiteplus-portal/` ←symlink→ `/Volumes/Galids-Toshiba1/Projects/jpg-ai-suiteplus-portal/` |
| **Original source (untouched)** | `/Volumes/Galids-Toshiba1/Projects/UST AI Suite/` (READ-ONLY going forward — don't edit) |
| **Plan + Handover docs (strategy)** | `/Users/jpgalido/Documents/GitHub/SCMA-SAPR-SL-00_Rapid-Impact-Analyzer/docs/migration/` — `AI_SUITEPLUS_PORTAL_PLAN.md` v1.3 + `AI_SUITEPLUS_PORTAL_HANDOVER.md` v1.3 |
| **Session handover (this file)** | `~/Projects/jpg-ai-suiteplus-portal/docs/SESSION_HANDOVER.md` |

**IMPORTANT — symlink reality:** `~/Projects/` is a symlink to `/Volumes/Galids-Toshiba1/Projects/`. The new repo physically lives on the Toshiba drive. Don't be surprised when paths flip.

---

## 2. GitHub state — what exists

### Org `JPG-Account` (Free plan, you are sole owner)

3 private repos created:

| Repo | Purpose | State |
|---|---|---|
| `jpg-ai-suiteplus-portal` | The hub: portal + admin + config + docs + infra | **148+ files, 14 commits on `main`** |
| `jpg-ai-suiteplus-audit-log` | Reserved (admin uses DB audit; this is dead weight for v0.1 — ignore) | Empty |
| `jpg-ai-suiteplus-ria-demo` | Spoke 1 placeholder (future Step 6+) | Empty |

4 teams (you are maintainer of each):

- `ai-suiteplus` (parent, closed privacy)
- `ai-suiteplus-platform` (push to portal + audit-log)
- `ai-suiteplus-reviewers` (push to portal)
- `ai-suiteplus-app-ria-demo` (push to ria-demo)

### Branch protection — NOT enabled

GitHub Free private blocks both legacy branch protection AND newer Repository Rulesets. **You self-merge with discipline.** Documented + accepted (PLAN.md R7).

### Dependabot — enabled

`.github/dependabot.yml` configured for:
- Weekly scan of `apps/portal/` npm deps
- Weekly scan of `apps/admin/` npm deps
- Monthly scan of GitHub Actions versions

---

## 3. Local environment state

### Authenticated tools

```bash
gh auth status  # → active: jpgalido-txm (NOT U19853_ust)
cf --version    # → 8.7.4
node --version  # → v20+ (or whatever was installed before)
pnpm --version  # → 9.12.0
pre-commit --version  # → 4.6.0 (installed via brew today)
```

### Existing local Postgres dev DB

**You don't have one yet.** Step 4.7 (next session) starts here:

```bash
docker run -d --name suiteplus-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=suite_plus_dev \
  postgres:16-alpine
```

### Required env file for local admin dev (NOT committed)

`~/Projects/jpg-ai-suiteplus-portal/apps/admin/.env.local` — was copied from source. Verify it has:

```
DATABASE_URL=postgres://postgres:devpass@localhost:5432/suite_plus_dev
SUPER_ADMIN_EMAIL=johnpatrick.galido@ust.com
SUPER_ADMIN_DISPLAY_NAME=Super Admin
AUTH_PROVIDER=local
AUTH_PASSWORD_PEPPER=<any 32-char string for dev>
REVALIDATE_SECRET=<any 32-char string for dev>
PORTAL_BASE_URL=http://localhost:3010
NEXT_PUBLIC_PORTAL_BASE_URL=http://localhost:3010
ADMIN_BASE_URL=http://localhost:3011
AUTH_ALLOWED_DOMAINS=@ust.com,@ust-global.com,@gmail.com
BOOTSTRAP_PRINT_SETUP_LINK=true
```

(`.env.local` is in `.gitignore` — never committed. Pre-commit `detect-secrets` would catch real secrets.)

---

## 4. The 14 commits — what got pushed

| # | Commit | Sub-step |
|---|---|---|
| 1 | `feat: initial import` (148 files) | Step 2 |
| 2 | `ci: add Dependabot config` | Step 1.4 |
| 3 | `refactor(admin/db): step 4.1-4.3 — SQLite→Postgres foundation` | Steps 4.1–4.3 |
| 4 | `refactor(admin/db): step 4.4 — port ensure-db + migrate-sql to Postgres` | Step 4.4 |
| 5 | `refactor(admin/lib): step 4.5a — async pg for shared lib (5/31)` | Step 4.5 lib batch |
| 6 | `refactor(admin): step 4.5b — async pg for read-only routes + drop scripts (12/31)` | 6 routes + scripts deleted |
| 7 | `refactor(admin): step 4.5c — async pg for user/auth/block/publish routes (18/31)` | 6 routes |
| 8 | `refactor(admin): step 4.5d — async pg for totp/domains/seo/snippets/invite (23/31)` | 5 routes |
| 9 | `refactor(admin): step 4.5e — async pg for rollback/preview/tiles (26/31)` | 3 routes |
| 10 | `refactor(admin): step 4.5f — async pg for approvals (28/31)` | 2 routes |
| 11 | `refactor(admin): step 4.5g — async pg for blocks/redirects (STEP 4.5 COMPLETE ✓)` | 2 routes |
| 12 | `fix(admin): step 4.8 — TypeScript clean (tsc --noEmit passes)` | Step 4.8 |

(Numbers in commit prefix reflect the running count.)

---

## 5. What changed in code — the architecture

### Before (source on Toshiba drive)

- `apps/admin/lib/db/client.ts` — sync `getSqlite()` using `better-sqlite3`
- `apps/admin/lib/db/schema.ts` — Drizzle `sqliteTable`, `integer mode:timestamp_ms`, `integer mode:boolean`
- `apps/admin/lib/db/ensure-db.ts` — sync bootstrap + lazy seed
- `apps/admin/lib/db/migrate-sql.ts` — SQLite CREATE TABLE syntax
- **33 files** scattered across `lib/` + `app/api/*/route.ts` calling `getSqlite().prepare(SQL).run/get/all(...)` synchronously
- `apps/admin/scripts/migrate.ts` + `scripts/seed.ts` — standalone migration runners

### After (new repo)

- `client.ts` — async `getPool()` + `getDb()`. Reads `DATABASE_URL` env OR scans `VCAP_SERVICES` for any `postgres://`-prefixed URI (robust parser per BTP Lead review). SSL config for BTP self-signed certs. Pool max 4 (free-tier safe).
- `schema.ts` — `pgTable`, `bigint mode:number` for timestamps (preserves ms-epoch storage), `boolean` for flags. All other columns work identically.
- `ensure-db.ts` — fully async. `ADD COLUMN IF NOT EXISTS` (pg 9.6+). Same 9-lane / 8-capability / 8-tile / 9-block / 3-snippet / 2-redirect seed data. Super-admin set-password URL still printed to stderr (banner) for `cf logs --recent | grep set-password`.
- `migrate-sql.ts` — Postgres dialect. `INTEGER` timestamps → `BIGINT`. `INTEGER` boolean flags → `BOOLEAN`. `BLOB` → `BYTEA`.
- **All 33 call sites** rewritten:
  - `db.prepare(sql).get(args)` → `(await pool.query(sql, [args])).rows[0]`
  - `db.prepare(sql).all(args)` → `(await pool.query(sql, [args])).rows`
  - `db.prepare(sql).run(args)` → `await pool.query(sql, [args])`
  - `?` placeholders → `$1, $2 ...` positional
  - SQLite `db.transaction(() => {...})` → `pool.connect()` + explicit `BEGIN`/`COMMIT`/`ROLLBACK`
  - `INSERT OR REPLACE` → `INSERT ... ON CONFLICT (col) DO UPDATE`
  - `INSERT OR IGNORE` → `INSERT ... ON CONFLICT (col) DO NOTHING`
  - `0/1` boolean comparisons → `FALSE/TRUE`
  - SQLite `UNIQUE` violation detection (`String(e.message).includes("UNIQUE")`) → pg error code `23505`
- **`scripts/migrate.ts` + `scripts/seed.ts` DELETED** — `ensure-db.ts` does it all lazily on first DB touch (per BTP Lead Step 6.6 fix: standalone scripts wouldn't be in Next.js standalone runtime image)
- **`package.json`** in admin: dropped `db:migrate`, `db:seed`, `db:reset` npm scripts. Added `pg`, `@types/pg`. Dropped `better-sqlite3`, `@types/better-sqlite3`.

### What's NOT changed (preserved as-is)

- Portal code (apps/portal/) — untouched. Still works.
- Admin auth flow (sign-in, set-password, change-password, sign-out, TOTP, sessions, CSRF, domain allowlist)
- Admin UI components (CMS-style composer, tile management, audit, governance, users)
- Manifest files (will update for `services: [ust-portfolio-db]` in Step 6.1)

---

## 6. Locked decisions — DO NOT RELITIGATE

| # | Decision | What it means |
|---|---|---|
| L | GitHub org slug | `JPG-Account` (created) |
| M | Brand name (personal) | "JPG AI SuitePlus" (personal-only — never on UST) |
| N | Deploy target | UST BTP `code_migration_space` via `cf push --docker-image` from BAS |
| O | CI/CD | GitHub Actions builds Docker image only. `cf push` is manual from BAS. |
| P | Container registry | `ghcr.io/jpg-account/ust-ai-suiteplus-portal:sha-<digest>` PUBLIC packages |
| Q | Reviewer | JP solo (accepted risk R7) |
| F | DB | Postgres (BTP `ust-portfolio-db` free plan, SQLite migration complete) |
| visibility | Repos | PRIVATE on Free plan (Rulesets unavailable but accepted) |
| naming | CF apps | `ust-ai-suiteplus-*` from day 1 (port to UST GitHub doesn't touch BTP) |
| port-timing | Port to UST GitHub | Run when JP decides. Not before Day 30. |

---

## 7. Open / pending items

| Item | Status | Notes |
|---|---|---|
| Step 4.7 — Local Docker Postgres smoke test | NEXT | See §8 |
| Step 4.9 — Security spot-check | Pending | CSRF on state-changing routes, domain allowlist enforcement, session expiry, TOTP enroll+verify |
| Step 5 — Docker image build via GitHub Actions | Pending | Needs `.github/workflows/build-image.yml` |
| Step 6 — BTP deploy via BAS | Pending | Manifests need `services: [ust-portfolio-db]` block + final app names |
| Step 7 — Smoke test on BTP | Pending | curl health + browser auth flow |
| Branch protection / Rulesets | Accepted gap | $0 cost option. If needed, upgrade to GitHub Team ($4/mo). |
| Audit-log repo (`jpg-ai-suiteplus-audit-log`) | Empty, dead weight | Ignore. Admin uses DB-backed audit. |
| RIA-demo repo (`jpg-ai-suiteplus-ria-demo`) | Empty, future | Not on Day 5 critical path. |
| `.staging-for-ust/` folder from source | Not copied | Excluded from rsync. If needed, copy manually. |

---

## 8. Step 4.7 — exact resume runbook

This is what to do next session.

### 8.1 Spin up local Postgres (5 min)

```bash
# If Docker Desktop is not running, start it first
open -a Docker
# Wait ~30s for Docker to be ready

# Start Postgres container
docker run -d --name suiteplus-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_DB=suite_plus_dev \
  postgres:16-alpine

# Verify it's up
docker ps | grep suiteplus-pg
psql postgres://postgres:devpass@localhost:5432/suite_plus_dev -c 'SELECT 1'
```

### 8.2 Verify .env.local has DATABASE_URL (1 min)

```bash
cd ~/Projects/jpg-ai-suiteplus-portal/apps/admin
grep DATABASE_URL .env.local
# Expected: DATABASE_URL=postgres://postgres:devpass@localhost:5432/suite_plus_dev
# If missing, add it.
```

### 8.3 Boot the admin against Postgres (2 min)

```bash
cd ~/Projects/jpg-ai-suiteplus-portal
pnpm --filter @ust/admin dev
# Should boot at http://localhost:3011
# First request triggers ensure-db.ts → creates schema + seeds super-admin
# Watch stderr for the banner with set-password URL
```

### 8.4 Manual smoke test (~30 min, browser at http://localhost:3011)

Follow this order:

1. **Visit `/sign-in`** → page renders without errors
2. **Grab set-password URL from terminal logs** (look for "SUPER ADMIN PASSWORD SETUP REQUIRED" banner)
3. **Visit set-password URL in browser** → set a password (min 12 chars)
4. **Should auto-sign-in** → redirect to admin dashboard `/`
5. **Click through every admin page**:
   - [ ] `/` — dashboard
   - [ ] `/site/tiles` — tile management, click "Edit" on a tile, change something, save
   - [ ] `/site/composer` — page composer, scroll the block list
   - [ ] `/site/seo` — SEO settings
   - [ ] `/site/snippets` — snippet management
   - [ ] `/governance/audit` — recent audit events should include your sign-in + tile edit
   - [ ] `/governance/revisions` — revision list (revision 1 from lazy seed)
   - [ ] `/access/users` — user list (super admin shown)
   - [ ] `/access/domains` — domain allowlist
   - [ ] `/approvals` — approvals queue (empty)
   - [ ] `/health` — health KPIs
   - [ ] `/preview-as` — preview as another role
   - [ ] `/settings/security` — security settings (try TOTP enrollment if you want)
6. **Test sign-out + sign-in again** with the password you set
7. **Stop the dev server** (Ctrl+C)

### 8.5 If anything broke

Most likely failure modes:

| Symptom | Probable cause | Fix |
|---|---|---|
| `relation "user_account" does not exist` | ensure-db.ts didn't fire | Check pnpm dev startup logs for Postgres connection error |
| 500 on a page | Async/await mismatch in a route I missed | Look at the page; grep `getPool` to find unawaited promises |
| TOTP enrollment fails | UNIQUE constraint on totp_secret needs ON CONFLICT clause | Already added — re-check totp/route.ts POST handler |
| Sign-in throws | Role narrowing issue | Already cast `role as SessionUser["role"]` — re-check |
| pg connection ECONNREFUSED | Docker Postgres not running | `docker start suiteplus-pg` |

### 8.6 If all green → commit nothing (no code changes), proceed to Step 4.9

---

## 9. What comes after Step 4.7

### Step 4.9 — Security spot-check (~1h)

Manual review of the admin's auth + state-mutation surface. Checklist:

- [ ] CSRF token required on all POST/PATCH/DELETE routes (`middleware.ts` enforces — verify)
- [ ] `withSuperAdmin` actually checks the session role before invoking handler
- [ ] Sign-in failure increments `failed_attempts` and locks after 5
- [ ] Sign-out invalidates session in DB (not just clears cookie)
- [ ] Domain allowlist actually blocks `@evil.com`
- [ ] TOTP cannot be skipped once enrolled
- [ ] Session expiry honored (alter `expires_at` to past, request → 401)
- [ ] `lib/auth/local-password-provider.setPasswordFromToken` consumes the token (sets `consumed_at`)
- [ ] Reset endpoints only work for super-admin

### Step 5 — Docker image build via GitHub Actions (~1h)

Create `.github/workflows/build-image.yml` that:
- Triggers on push to `main` (and PR builds with no push)
- Builds 2 multi-stage Docker images: portal + admin
- Pushes to `ghcr.io/jpg-account/ust-ai-suiteplus-portal:sha-<digest>` and `:admin-sha-<digest>` (or two separate repo packages)
- Sets package visibility PUBLIC (sidesteps 500MB private cap)

Tag image with both `latest` and `sha-<commit-sha>` for traceability.

### Step 6 — BTP deploy (~2h, requires BAS session)

Pre-flight:
```bash
# In BAS terminal
cf login --sso
cf target -o "UST Global Inc" -s code_migration_space
cf services | grep ust-portfolio-db  # ensure service exists
cf apps | grep -E "^ust-ai-suiteplus"  # ensure no collisions
```

Update manifests (`apps/portal/manifest.yml`, `apps/admin/manifest.yml`):
- App names: `ust-ai-suiteplus-portal`, `ust-ai-suiteplus-portal-admin`
- Admin manifest adds `services: [ust-portfolio-db]`
- Routes: `*.cfapps.us10-001.hana.ondemand.com`
- Health check `/api/health`

Deploy (NO `--strategy rolling` on first push):
```bash
cd /home/user/projects/jpg-ai-suiteplus-portal  # in BAS, NOT your Mac path
cf push -f apps/portal/manifest.yml \
  --docker-image ghcr.io/jpg-account/ust-ai-suiteplus-portal:sha-<digest>
cf push -f apps/admin/manifest.yml \
  --docker-image ghcr.io/jpg-account/ust-ai-suiteplus-portal-admin:sha-<digest>

# Set env vars
cf set-env ust-ai-suiteplus-portal-admin SUPER_ADMIN_EMAIL "johnpatrick.galido@ust.com"
cf set-env ust-ai-suiteplus-portal-admin AUTH_PASSWORD_PEPPER "$(openssl rand -hex 32)"
cf set-env ust-ai-suiteplus-portal-admin REVALIDATE_SECRET "$(openssl rand -hex 32)"
cf set-env ust-ai-suiteplus-portal-admin PORTAL_BASE_URL "https://ust-ai-suiteplus-portal.cfapps.us10-001.hana.ondemand.com"
cf set-env ust-ai-suiteplus-portal-admin NEXT_PUBLIC_PORTAL_BASE_URL "https://ust-ai-suiteplus-portal.cfapps.us10-001.hana.ondemand.com"
cf set-env ust-ai-suiteplus-portal-admin ADMIN_BASE_URL "https://ust-ai-suiteplus-portal-admin.cfapps.us10-001.hana.ondemand.com"
cf set-env ust-ai-suiteplus-portal-admin AUTH_PROVIDER local
cf restart ust-ai-suiteplus-portal-admin

# Wait ~10s, then retrieve set-password URL
sleep 10
cf logs ust-ai-suiteplus-portal-admin --recent | grep "set-password"
```

### Step 7 — Smoke test on BTP (~30 min)

```bash
# Public endpoints (alive)
curl -i https://ust-ai-suiteplus-portal.cfapps.us10-001.hana.ondemand.com/api/health
curl -i https://ust-ai-suiteplus-portal-admin.cfapps.us10-001.hana.ondemand.com/api/health

# Open the set-password URL from cf logs in your browser
# Set a password, sign in, click through admin pages
# Verify a tile shows up on portal homepage
```

---

## 10. Known risks to watch in next session

1. **DATABASE_URL parsing on BTP** — the VCAP_SERVICES parser scans for `postgres://` URIs. If the BTP service injects a different scheme or nested structure, it fails. **Test locally first** (Step 4.7) before assuming BTP will work.
2. **Free-plan Postgres connection cap** — max 4 connections in the pool. Don't increase; it'll get throttled.
3. **`pnpm-lock.yaml` integrity** — if you `pnpm add` anything new locally without committing the lockfile, the Docker build will fail.
4. **`cf push` first-deploy** — do NOT use `--strategy rolling` on first push; CF rejects without a prior instance.
5. **GHCR public package visibility** — must be PUBLIC for `cf push --docker-image` to pull without auth. New packages default to PRIVATE.
6. **macOS Docker on Toshiba drive** — verify the volume mount works at `~/Projects/jpg-ai-suiteplus-portal/apps/admin` (Docker on macOS sometimes has trouble with non-default Volumes paths). Backup plan: clone fresh into `/Users/jpgalido/dev/jpg-ai-suiteplus-portal` if Docker complains.

---

## 11. What "done" looks like by Day 5

- `curl https://ust-ai-suiteplus-portal.cfapps.us10-001.hana.ondemand.com/api/health` returns 200
- `curl https://ust-ai-suiteplus-portal-admin.cfapps.us10-001.hana.ondemand.com/api/health` returns 200
- Browser: open admin → sign in via set-password URL → see admin dashboard
- Add a test tile via `/site/tiles` → see it on portal homepage
- All existing admin features intact (audit log, revisions, user management, composer)

Days 6–30 are pure buffer + dress rehearsal + RIA tile registration.

---

## 12. Quick-start commands for next session

```bash
# Resume where we left off
cd ~/Projects/jpg-ai-suiteplus-portal
git status              # should be clean
git log --oneline -5    # last 5 commits — confirms you're on the same head
pnpm tsc --noEmit       # confirm still type-clean (should be silent + exit 0)

# Start Step 4.7
open -a Docker
docker run -d --name suiteplus-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=suite_plus_dev \
  postgres:16-alpine

pnpm --filter @ust/admin dev   # http://localhost:3011
# (in another terminal, watch logs for the set-password URL banner)
```

---

## 13. Where to find more context

| If you need | Read |
|---|---|
| The strategic plan (why we're doing this) | `/Users/jpgalido/Documents/GitHub/SCMA-SAPR-SL-00_Rapid-Impact-Analyzer/docs/migration/AI_SUITEPLUS_PORTAL_PLAN.md` v1.3 |
| The 7-step migration runbook | `/Users/jpgalido/Documents/GitHub/SCMA-SAPR-SL-00_Rapid-Impact-Analyzer/docs/migration/AI_SUITEPLUS_PORTAL_HANDOVER.md` v1.3 |
| The exact 4.5a-4.5g commits | `git log apps/admin/lib/ apps/admin/app/api/` in the new repo |
| Original source (untouched, READ-ONLY) | `/Volumes/Galids-Toshiba1/Projects/UST AI Suite/` |
| BTP-specific deploy gotchas | `~/.claude/skills/ust-ai-suite-plus-sap/SKILL.md` + `btp-cf-deploy` skill |

---

**End of handover. Resume at §8 next session.**
