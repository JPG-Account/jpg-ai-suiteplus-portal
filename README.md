# UST AI Suite+ for SAP

A governed UST SAP capability portfolio — AI-enabled accelerators, SAP solution
assets, business tools, and industry demos in one organized showcase.

## What UST AI Suite+ for SAP is

**One portfolio.** A single place to understand UST SAP capabilities across
assessments, analyzers, calculators, accelerators, and solution assets.

**One audience model.** Nine lanes that match how clients buy — Executives,
Architects, Business, Consultants, Developers, Ops, Governance, Finance, and
Industry / Domain. Every capability declares one primary lane (and optional
secondary lanes) so Client Partners, Account Managers, and SAP teams can
position the right story quickly.

**A governed UST-owned repository.** Migrated capabilities live in the
canonical UST repo and follow a single intake → sanitize → register → review
→ publish path. No personal-repo history. No client confidential content. No
ClarisTXM private IP. No vendor-specific AI claims.

**An honest mix of AI and non-AI.** The portfolio includes AI-assisted
analyzers (RIA), AI-enabled enablement (Client University), business tools
(ROI Calculator), and SAP solution accelerators that are not AI at all
(FlexIOM). The portfolio honors that distinction.

**A reusable shell, not a reusable product.** Shared design tokens,
navigation, layouts, card templates, and platform patterns reduce duplicated
work. Solution-specific logic, data, prompts, and claims still require
ownership and review.

## Honest positioning

> UST AI Suite+ for SAP brings together AI-enabled accelerators, SAP-focused
> solution assets, value tools, industry demos, and practical enablement
> capabilities for SAP-led transformation.

Never imply SAP endorsement, SAP ownership, or SAP product equivalence. Never
name a specific AI model or vendor in client-facing surfaces — say "AI", "AI
assistant", "the assistant", or "model-backed". Model selection is a
deployment detail.

## Canonical destinations

- **UST repo (migration target):** `https://github.com/UST-Account/SCMA-SAPR-SL-00_Rapid-Impact-Analyzer`
- **Deploy target:** SAP BTP Cloud Foundry
  - Org: `UST Global Inc`
  - Subaccount: `BUILD_AI_SUBACCOUNT`
  - Space: `code_migration_space`

## Quick start (local dev)

```bash
pnpm install
pnpm --filter @ust/portal dev
# → http://localhost:3010
```

## Structure

```
ust-ai-suite-plus-sap/
  apps/portal/              # the showcase (Next.js 14)
  config/lanes.yaml         # 9 audience lanes — source of truth
  config/solutions.yaml     # 8 initial capabilities — source of truth
  config/feature-flags.yaml # portal feature flags
  source/                   # locked V0 inputs (HTML + charter MD)
  docs/                     # architecture · onboarding · governance · solution-cards
  infra/                    # btp · github-actions
  packages/                 # (reserved) shared packages
```

## Current portfolio (V0)

| Solution | Primary lane | Status |
|---|---|---|
| RIA (Rapid Impact Analyzer) | AI for Developers | Live |
| Client University | AI for Ops | Demo |
| Rapid Assessment | AI for Consultants | Demo |
| ROI Calculator | AI for Finance | Demo |
| Trade Promotion Optimizer | AI for Industry / Domain | Demo |
| CX for Life Sciences | AI for Industry / Domain | Available |
| CX for Insurance | AI for Industry / Domain | Available |
| FlexIOM | AI for Business | Available |

## Migration protocol

Migration is JP-initiated, per asset, and **history-scrubbed**:

1. JP names the asset to migrate.
2. Inventory the current working tree.
3. Sanitize — strip vendor names, client data, credentials, personal startup IP.
4. Stage under `apps/<solution>/` with a clean README.
5. Register in `config/solutions.yaml`.
6. Open a PR with a single initial-migration commit (no history import).
7. Wait for JP's go-ahead before flipping `enabled: true` on the showcase.

For the portal itself, see [`docs/migration/PORTAL_TO_UST.md`](docs/migration/PORTAL_TO_UST.md).

## Deploy

- **Platform:** SAP BTP Cloud Foundry (`UST Global Inc` / `BUILD_AI_SUBACCOUNT` / `code_migration_space`).
- **Pattern:** GitHub Actions builds a multi-stage Docker image on every push to `main` that touches `apps/portal/**` → image published to `ghcr.io/ust-account/ust-ai-suite-plus-sap-portal` → `cf push` pulls the image.
- **Artifacts:** `apps/portal/Dockerfile` · `apps/portal/.dockerignore` · `apps/portal/manifest.yml` · `.github/workflows/portal-deploy.yml`.
- **Health check:** `GET /api/health` → 200 JSON.

## Adding a new capability (intake)

1. Run the intake checklist in `source/SKILL_v2.md` § Intake checklist.
2. Add a `config/solutions.yaml` entry (id · name · type · status · lanes ·
   description · features · tags · enabled).
3. Scaffold `apps/<solution>/` (README · src · public · tests · docs).
4. Pass the Governance Review Checklist before flipping `enabled: true`.
