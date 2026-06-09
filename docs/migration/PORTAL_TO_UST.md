# Migration runbook — Portal to UST repo & SAP BTP CF

> Single source of truth for moving the Suite+ portal from the local authoring
> workspace into the canonical UST repo and deploying it to SAP BTP Cloud
> Foundry. Aligns with the `ust-ai-suite-plus-sap` skill hard rules
> (history-scrubbed · canonical repo · vendor-name scrub · BTP CF target).

## Targets

| What | Where |
|---|---|
| Canonical UST repo | `https://github.com/UST-Account/SCMA-SAPR-SL-00_Rapid-Impact-Analyzer` |
| BTP Cloud Foundry API | `https://api.cf.us10-001.hana.ondemand.com` |
| Org · Subaccount · Space | UST Global Inc · BUILD_AI_SUBACCOUNT · `code_migration_space` |
| Container registry | `ghcr.io/ust-account/ust-ai-suite-plus-sap-portal` |
| Portal CF app name | `ust-ai-suite-plus-sap-portal` |
| Portal default route | `ust-ai-suite-plus-sap.cfapps.us10-001.hana.ondemand.com` |

## Preconditions

- [ ] Local working tree at `/Volumes/Galids-Toshiba1/Projects/UST AI Suite/`
      is clean (Suite+ portal V0 reviewed and approved by JP).
- [ ] GitHub Actions secrets are populated in the UST repo:
      `CF_API`, `CF_USERNAME`, `CF_PASSWORD`, `CF_ORG`, `CF_SPACE`,
      `GHCR_PULL_PAT` (only if GHCR package is kept private).
- [ ] JP has explicitly named this asset for migration (this runbook).

## Architecture decision (recorded)

Two CF apps in one space, single monorepo. Portal is the **new** app at
`ust-ai-suite-plus-sap.cfapps.us10-001.hana.ondemand.com`. RIA stays at its
existing route. No production disruption to RIA.

## Step 1 — Prepare the local working copy

The portal was authored fresh in this session — no personal-repo `.git`
history to scrub. We still treat the push as a clean snapshot.

```bash
cd "/Volumes/Galids-Toshiba1/Projects/UST AI Suite"

# Sanity scrub for vendor names anywhere in the tree
grep -RiE 'claude|anthropic|openai|gpt-?[0-9]' \
  apps config docs source README.md CODEOWNERS 2>/dev/null \
  | grep -v node_modules || echo "No vendor names found ✓"
```

## Step 2 — Clone the UST repo

```bash
cd /tmp && rm -rf ust-repo && \
  git clone https://github.com/UST-Account/SCMA-SAPR-SL-00_Rapid-Impact-Analyzer ust-repo && \
  cd ust-repo && git checkout -b migration/suite-plus-portal
```

## Step 3 — Move existing RIA tree under `apps/ria/`

Only if the current UST repo root holds RIA at the top level. This is a
structural-only commit — no functional changes.

```bash
git mv <existing-ria-paths> apps/ria/
git commit -m "chore(structure): relocate RIA under apps/ria/ (monorepo prep)"
```

If RIA already lives at `apps/ria/`, skip this step.

## Step 4 — Stage the Suite+ portal + monorepo scaffolding

Copy from the authoring workspace. **Excludes** `node_modules`, `.next`,
`.turbo`, `.DS_Store`.

```bash
SRC="/Volumes/Galids-Toshiba1/Projects/UST AI Suite"
DST="/tmp/ust-repo"

rsync -av --delete \
  --exclude node_modules --exclude .next --exclude .turbo \
  --exclude .DS_Store --exclude .git \
  "$SRC/apps/portal/" "$DST/apps/portal/"

cp -R "$SRC/config" "$DST/config"
cp -R "$SRC/source" "$DST/source"
cp -R "$SRC/.github/workflows/portal-deploy.yml" "$DST/.github/workflows/portal-deploy.yml"

# Workspace files — merge carefully if RIA already has its own
cp "$SRC/pnpm-workspace.yaml" "$DST/pnpm-workspace.yaml"
cp "$SRC/package.json" "$DST/package.json"
cp "$SRC/.gitignore" "$DST/.gitignore"
```

If the UST repo already has its own root `package.json` / workspace file
(because RIA was already a workspace), **do not overwrite** — instead, hand-merge
the workspaces array to include `apps/portal`.

## Step 5 — Commit & open PR

One logical commit per concern:

```bash
cd /tmp/ust-repo
git add apps/portal config source pnpm-workspace.yaml .gitignore
git commit -m "feat(portal): initial migration of UST AI Suite+ for SAP portal — sanitized snapshot from authoring workspace"

git add .github/workflows/portal-deploy.yml
git commit -m "ci(portal): add BTP CF deploy workflow (Docker → GHCR → cf push)"

git add package.json
git commit -m "chore(root): mark Suite+ portal as the dev entry point"

git push -u origin migration/suite-plus-portal
```

Open a PR to `main`. PR body checklist:

- [ ] Canonical UST repo target ✓
- [ ] No AI vendor names in any UST-facing surface ✓
- [ ] Deploys to SAP BTP Cloud Foundry (no other targets) ✓
- [ ] History-scrubbed (no personal-repo `.git` import) ✓

## Step 6 — Merge & deploy

On merge to `main`, the `portal-deploy` workflow:

1. builds `apps/portal/Dockerfile` (multi-stage)
2. pushes `ghcr.io/ust-account/ust-ai-suite-plus-sap-portal:{sha-…, latest}`
3. logs into BTP CF using stored secrets
4. runs `cf push -f apps/portal/manifest.yml --docker-image …`
5. smoke-tests `https://<route>/api/health`

## Step 7 — Verify

```bash
# from anywhere with cf CLI configured to BUILD_AI_SUBACCOUNT / code_migration_space
cf app ust-ai-suite-plus-sap-portal
cf logs ust-ai-suite-plus-sap-portal --recent
curl -i https://ust-ai-suite-plus-sap.cfapps.us10-001.hana.ondemand.com/api/health
```

Expected: `200 OK` and a JSON body
`{ "status": "ok", "service": "ust-ai-suite-plus-sap-portal", … }`.

## Rollback

```bash
cf rollback ust-ai-suite-plus-sap-portal --version <previous-revision>
# or redeploy a known-good SHA:
cf push -f apps/portal/manifest.yml \
  --docker-image ghcr.io/ust-account/ust-ai-suite-plus-sap-portal:sha-<good-sha>
```

## Custom domain (optional, later)

`ust-ai-suite-plus-sap.cfapps.us10-001.hana.ondemand.com` is the default BTP
route. To map a UST-owned domain (e.g., `ai-suite-plus.ust.com`):

1. UST DNS team: add CNAME → `cfapps.us10-001.hana.ondemand.com`.
2. In CF: `cf create-domain "UST Global Inc" ai-suite-plus.ust.com`
3. In CF: `cf map-route ust-ai-suite-plus-sap-portal ai-suite-plus.ust.com`
4. Update `apps/portal/manifest.yml` to add the new route.
