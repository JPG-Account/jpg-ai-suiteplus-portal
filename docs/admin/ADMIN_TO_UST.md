# Migration runbook — Admin to UST repo & SAP BTP CF

> Mirrors `PORTAL_TO_UST.md`. Steps to push `apps/admin/` into the canonical UST
> repo and stand up a separate CF app at
> `ust-ai-suite-plus-sap-admin.cfapps.us10-001.hana.ondemand.com`.

## Targets

| What | Where |
|---|---|
| Canonical UST repo | `https://github.com/UST-Account/SCMA-SAPR-SL-00_Rapid-Impact-Analyzer` |
| BTP CF API | `https://api.cf.us10-001.hana.ondemand.com` |
| Org · Subaccount · Space | UST Global Inc · BUILD_AI_SUBACCOUNT · `code_migration_space` |
| Container registry | `ghcr.io/ust-account/ust-ai-suite-plus-sap-admin` |
| App name | `ust-ai-suite-plus-sap-admin` |
| Default route | `ust-ai-suite-plus-sap-admin.cfapps.us10-001.hana.ondemand.com` |

## Preconditions

- Portal already deployed and reachable.
- New GitHub Actions secrets in the UST repo:
  - `ADMIN_SUPER_EMAIL` — production Super Admin email (likely your UST address)
  - `ADMIN_REVALIDATE_SECRET` — strong random string · **MUST match** the portal's
  - `ADMIN_PORTAL_BASE_URL` — `https://ust-ai-suite-plus-sap.cfapps.us10-001.hana.ondemand.com`
  - Existing `CF_API · CF_USERNAME · CF_PASSWORD · CF_ORG · CF_SPACE`
- Portal also needs `REVALIDATE_SECRET` set in CF to the same value:
  ```bash
  cf set-env ust-ai-suite-plus-sap-portal REVALIDATE_SECRET "<same-value>"
  cf set-env ust-ai-suite-plus-sap-portal ADMIN_BASE_URL "https://ust-ai-suite-plus-sap-admin.cfapps.us10-001.hana.ondemand.com"
  cf restage ust-ai-suite-plus-sap-portal
  ```

## Step 1 — Prepare local working copy

Vendor-name scrub before push:

```bash
cd "/Volumes/Galids-Toshiba1/Projects/UST AI Suite"
grep -RinE 'claude|anthropic|openai|gpt-?[0-9]' \
  apps/admin --include='*.ts' --include='*.tsx' --include='*.css' --include='*.json' \
  2>/dev/null | grep -v node_modules | grep -v '\.next' | grep -v '/data/' \
  || echo "scrub clean ✓"
```

## Step 2 — Clone UST repo + branch

```bash
cd /tmp && rm -rf ust-repo
git clone https://github.com/UST-Account/SCMA-SAPR-SL-00_Rapid-Impact-Analyzer ust-repo
cd ust-repo && git checkout -b migration/admin-v0.8
```

## Step 3 — Stage the admin app + deploy artifacts

```bash
SRC="/Volumes/Galids-Toshiba1/Projects/UST AI Suite"
rsync -av --delete \
  --exclude node_modules --exclude .next --exclude .turbo \
  --exclude .DS_Store --exclude .git --exclude 'data/*.sqlite*' \
  "$SRC/apps/admin/" apps/admin/
mkdir -p .github/workflows
cp "$SRC/.github/workflows/admin-deploy.yml" .github/workflows/admin-deploy.yml
cp -R "$SRC/docs/admin" docs/admin
```

## Step 4 — Commit & PR

```bash
git add apps/admin docs/admin
git commit -m "feat(admin): Suite+ Admin V0.8 — backend + approvals engine + heuristic health"
git add .github/workflows/admin-deploy.yml
git commit -m "ci(admin): add BTP CF deploy workflow"
git push -u origin migration/admin-v0.8
```

PR body checklist:

- [ ] Canonical UST repo target
- [ ] No AI vendor names in any UST-facing surface
- [ ] Deploys to SAP BTP Cloud Foundry only
- [ ] History-scrubbed
- [ ] `ADMIN_REVALIDATE_SECRET` matches portal's

## Step 5 — Merge & deploy

Merge to `main`. GitHub Action:

1. Builds `apps/admin/Dockerfile` (multi-stage).
2. Pushes `ghcr.io/ust-account/ust-ai-suite-plus-sap-admin:{sha-…, latest}`.
3. `cf login` + `cf push -f apps/admin/manifest.yml --docker-image …`.
4. Sets runtime env vars + `cf restage`.
5. Smoke-tests `/api/health` (10 retries × 6s).

## Step 6 — Verify

```bash
cf app ust-ai-suite-plus-sap-admin
curl -i https://ust-ai-suite-plus-sap-admin.cfapps.us10-001.hana.ondemand.com/api/health
curl -i https://ust-ai-suite-plus-sap-admin.cfapps.us10-001.hana.ondemand.com/sign-in
```

Sign in with the production Super Admin email. Make a hero edit. Confirm the
**portal** (separate CF app) reflects it within seconds.

## Caveats for V0.8 on BTP

- **Persistence:** the admin's SQLite lives on the container filesystem. CF
  containers are ephemeral — every `cf restage` or auto-heal recreates it. For
  V0.8 this means edits survive within an instance lifetime but not across
  redeploys. **V0.9 swaps SQLite for HANA Cloud.** Until then, treat BTP admin
  as a test bed and re-do edits after restage.
- **Health endpoint** is unauthenticated by design (CF health check needs it).
- **`/api/config/current`** is unauthenticated by design (portal needs it).
- **Everything else** requires Super Admin session.

## Rollback

```bash
cf rollback ust-ai-suite-plus-sap-admin --version <previous-revision>
# or
cf push -f apps/admin/manifest.yml --docker-image ghcr.io/ust-account/ust-ai-suite-plus-sap-admin:sha-<good-sha>
```
