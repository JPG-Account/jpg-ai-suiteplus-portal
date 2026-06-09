# Suite+ Admin V0 — Build Plan

> Synthesis of two specialist build plans (Solution Architect · UI/UX Front-End Developer) into a single Plan-Eng-Validate handover. **Goal:** ship a pixel-faithful, locally-runnable admin app that JP can click end-to-end before any deploy.

## 1. Scope of this build

- **In:** all 12 screens + Environment Diff modal from `apps/portal/mocks/admin-v0.html` rendered as a real Next.js app at `apps/admin/` with mock data.
- **Out:** real backend (HANA, IAS, IPS, SCIM, BTP Audit Log, Cloud ALM, Object Store), real auth, real publish, real role gating, real Destination resolution.
- **Quality bar:** visual fidelity to the mock at 1440 × 900. Every nav click works. Every wired interaction (drawers, modals, tabs, filters, search, role picker, calendar, env switcher) works. Every empty state is mocked. No animations in admin (per both specialists).

## 2. Stack & monorepo layout

```
apps/
  portal/                    (existing — untouched)
  admin/                     (NEW)
    app/
      layout.tsx             (AdminShell wraps everything)
      page.tsx               (01 · Action Dashboard at /)
      (site)/
        composer/page.tsx    (02 · Site Composer)
        tiles/page.tsx       (03 · Capability Tile Editor)
        snippets/page.tsx    (04 · Snippets Library)
        seo/page.tsx         (06 · Redirects + SEO Hub)
      schedule/page.tsx      (05 · Schedule & Calendar)
      health/page.tsx        (07 · Site Health)
      preview-as/page.tsx    (08 · Preview-as-Role)
      (access)/
        users/page.tsx       (09 · Users & Roles)
        scim/errors/page.tsx (10 · SCIM Sync Errors)
      approvals/page.tsx     (11 · Approvals Inbox)
      (governance)/
        audit/page.tsx       (12 · Audit Log)
      api/health/route.ts    (BTP CF healthcheck)
    components/              (shared atoms + molecules + organisms)
    lib/
      data/                  (typed mock registries)
      types.ts               (shared TS types)
      hooks/                 (useOverlay, useFilter, useUrlState)
    public/
    package.json             (port 3011)
    tsconfig.json
    next.config.mjs
```

**No new top-level dependencies.** Just `next@14.2.18`, `react@18.3.1`, `react-dom@18.3.1`, types. Same versions as portal so the pnpm-lock stays clean.

## 3. Data layer

All mock data lives under `apps/admin/lib/data/`, exported `as const` from typed modules:

```
lib/data/
  capabilities.ts   (8 tiles · health · routes)
  users.ts          (412 users sample — 8 rendered, virtualized for the table)
  roles.ts          (7 roles with scope arrays)
  snippets.ts       (11 reusable global blocks)
  schedule.ts       (4 calendar events)
  audit.ts          (~150 events for the audit screen)
  scim.ts           (1 active error · 3 resolved)
  approvals.ts      (3 pending · with comment thread)
  redirects.ts      (14 active rules · SEO defaults)
  composer.ts       (block tree for the landing-page draft v48)
  revisions.ts      (v47/v48 diff for the Env Diff modal)
```

Pages import directly. **No fetch, no client-side data libraries.** Pages default to Server Components; only screens with interactivity opt into `"use client"`.

## 4. State management

| What | Where |
|---|---|
| Active filter / search / tab / drawer-open / selected-row | `useSearchParams` + `router.replace` (URL state) |
| Composer block tree + selection + dirty flag | `useReducer` (one reducer, ~10 actions) |
| Drawer / Modal focus trap + open state | `useOverlay()` custom hook (small) |
| Bulk-select checkboxes (Users screen) | `useState` local |
| Composer autosave indicator | `setTimeout` mock — flips between Saving / Saved every few seconds |

**No Zustand, no Redux, no Context for app state.** Per both specialists.

## 5. Shared component inventory

Built once in `apps/admin/components/`, reused across all screens:

**Layout (build first — Phase 4a)**
1. `AdminShell` — grid wrapper
2. `Rail` — 240px left nav with sections (Configure · Operate · Govern · Build)
3. `TopBar` — breadcrumb · env switcher · icon row · avatar
4. `PageHeader` — title · subtitle · actions slot
5. `Icons` — single SVG icon set

**Atoms**
6. `Button` (primary · default · ghost · danger)
7. `Chip` (filter · lane · role · status)
8. `Pill` (StatusPill: Live · Demo · Available · Danger)
9. `Toggle` switch
10. `Avatar`
11. `SearchInput`
12. `TextField` / `Textarea`
13. `KbdHint`

**Molecules**
14. `KpiCard`
15. `WidgetCard` (h3 + meta + body + footer-link)
16. `Tabs`
17. `FilterBar`
18. `BulkActionBar`
19. `EmptyState`
20. `JsonBlock` (mono with `.k`/`.s`/`.n` syntax classes)
21. `OgPreviewCard`
22. `WarningBar` (yellow composer top strip)

**Organisms**
23. `DataTable` (generic: columns config, row-state for danger/amber, selection)
24. `Drawer` (right slide-over, focus-trapped, Esc-to-close)
25. `Modal` (centered, with optional split-pane variant)
26. `Calendar` (month grid + event dots)
27. `RolePicker` (pill bar)
28. `ThreadPanel` (Approvals comments + composer)
29. `AuditEventRow` (collapsible with JSON detail)
30. `DiffPane` / `DiffLine` (for Env Diff modal)

## 6. Per-screen build order

Mirroring the SA's order — minimises rework by building shell + the screens that share the most components first.

| # | Screen | Phase | New components | Reuses |
|---|---|---|---|---|
| — | Shell + tokens + nav | 4a | AdminShell · Rail · TopBar · PageHeader · Icons | — |
| 01 | Action Dashboard | 4b | ActionRequired · FailingTiles · RecentPublishes widgets | KpiCard · WidgetCard · Chip |
| 09 | Users & Roles | 4b | UsersTable · RoleChipCell | DataTable · BulkActionBar · Chip · Avatar |
| 03 | Tile Editor (table only first; drawer in 4c) | 4b | TileTable | DataTable · Chip · Pill |
| 04 | Snippets Library | 4b | SnippetCard · SnippetGrid | FilterBar · SearchInput · Chip |
| 12 | Audit Log | 4b | AuditEventRow | JsonBlock · FilterBar |
| 10 | SCIM Sync Errors | 4b | ActiveErrorCard · ResolvedFeed | JsonBlock · Chip · EmptyState |
| 07 | Site Health | 4b | TileHealthTable | DataTable · KpiCard · Pill |
| 06 | Redirects + SEO | 4b | RedirectsTable · SeoDefaults · OgPreviewCard | DataTable · TextField |
| 03 | Tile Editor (drawer wired) | 4c | TileDrawer · RouteRadioGroup | Drawer · Chip · Toggle |
| 11 | Approvals Inbox | 4c | ApprovalsQueue · PastSlaRow · ApprovalThread · ApprovalComposer | ThreadPanel · TextField · Button |
| 05 | Schedule & Calendar | 4c | MonthCalendar · EventDot · UpcomingPanel | Chip · PageHeader |
| 08 | Preview-as-Role | 4c | RolePicker · SideBySidePreview | Pill |
| 02 | Site Composer | 4d | BlockList · BlockItem · PreviewFrame · PropertiesPanel | WarningBar · Tabs · TextField · Toggle |
| 13 | Env Diff modal | 4d | EnvDiffModal · IncludeToggleList · A11yPreflight | Modal · DiffPane · DiffLine · Toggle |

## 7. Build phases (Phase 4 of build-loop)

### 4a · Shell & tokens
- Scaffold the Next.js app (package.json, tsconfig, next.config, layout, globals.css)
- Port the design tokens + base classes from the mock CSS into `app/globals.css`
- Build `AdminShell`, `Rail`, `TopBar`, `PageHeader`, `Icons`
- Stub all 12 page.tsx files with a placeholder PageHeader
- Add `/api/health` route
- **Runnable**: `pnpm --filter @ust/admin dev` serves http://localhost:3011, every nav click loads a page (even if stubbed).

### 4b · Read-only screens
Build the 8 screens that need no overlays: Dashboard · Users · Tiles (table only) · Snippets · SCIM · Health · Redirects · Audit. Each consumes its mock-data registry, supports filter/search via URL state, and renders empty states correctly.
- **Runnable**: every screen visually matches the mock; filters and search work via URL params.

### 4c · Interactive overlays
- `Drawer` host component (focus trap, Esc, return-focus)
- Wire the Tile Editor drawer (Route radio, lanes picker, manifest health)
- Build Approvals Inbox (queue + thread)
- Build Schedule calendar
- Build Preview-as-Role role picker + side-by-side preview
- **Runnable**: every drawer/tab/role-picker works.

### 4d · Composer + Env Diff
- Build the Composer 3-pane (BlockList with up/down move buttons, read-only PreviewFrame with device toggle, tabbed PropertiesPanel)
- Implement the Composer reducer (~10 actions)
- Build `Modal` host (focus trap, Esc)
- Build EnvDiffModal as a parallel-route intercepted modal at `/site/composer/publish`
- **Runnable**: end-to-end publish flow (mocked) from Composer → Diff modal → success toast.

## 8. Validation gates (Phase 5 of build-loop)

Critical/High failures block Phase 6 deploy. Adapted from both specialists.

| # | Gate | Pass criteria |
|---|---|---|
| V1 | Every route returns 200 | curl all 12 routes + `/api/health` |
| V2 | No client-side console errors | Manual click-through |
| V3 | Visual fidelity | Side-by-side mock vs running app at 1440×900 · per-screen delta ≤ minor padding |
| V4 | Keyboard navigation | Tab order valid · Esc closes Drawer/Modal · Enter activates focused row |
| V5 | Accessibility | Visible focus rings · semantic HTML · role chips have text + color · `prefers-reduced-motion` respected |
| V6 | Vendor-name scrub | `grep -RinE 'claude\|anthropic\|openai\|gpt-?[0-9]'` across `apps/admin/` returns 0 hits |
| V7 | Hard-rule scrub | No mention of Render/Vercel/Heroku/AWS as deploy targets · no client confidential / personal IP |
| V8 | Type check | `pnpm --filter @ust/admin exec tsc --noEmit` clean · no `any` in `lib/data/` |
| V9 | Build | `pnpm --filter @ust/admin build` succeeds |
| V10 | Bundle | Largest route (Composer) < 250 KB gzipped |
| V11 | Back/forward | URL state preserved across browser nav |

## 9. Trade-offs & deferred to backend phase

Deferred (not in this build, JP will see UI for them but mocked):

- HANA-backed revisions and Object Store config delivery
- IAS OIDC login (admin is always Suite Admin "John Patrick" locally)
- SCIM ingestion from IPS
- BTP Audit Log Service / Cloud ALM writes
- Dual-control approval enforcement (UI shows it, no backend gate)
- ISR config delivery to portal
- Real autosave durability (sessionStorage only, optional)
- Role-based UI gating (render-as-Suite-Admin only)
- Real DiffViewer computation (precomputed mock revisions)
- Real OG fetch (mocked unfurl)
- BTP CF deploy artifacts (Dockerfile, manifest.yml, workflow) — added in a follow-up PR once JP approves the V0 build

## 10. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Composer scope creep | Lock to mock's 7 block types; don't accept arbitrary block kinds |
| R2 | Pixel fidelity vs reuse tension | Treat padding deltas in mock as mock bugs; shared components win |
| R3 | Drawer/Modal focus-trap correctness | Budget half a day for the host components; manual a11y pass |
| R4 | Intercepted route quirks | Ship full-page fallback route at `/site/composer/publish` in same PR |
| R5 | Token drift from portal | Add a `pnpm tokens:diff` script comparing the two `globals.css` token blocks |
| R6 | CSS sprawl | ~15 primitive classes in globals.css; everything else co-located CSS-Modules or inline |
| R7 | Audit virtualization perf | 150-row cap in mock; virtualizer optional |

## 11. Definition of done

A reviewer (JP) can:
- [x] Open http://localhost:3011 and see the Action Dashboard
- [x] Click every left-rail item and reach the right screen
- [x] Open the Capability Tile drawer, pick a Route radio, close it
- [x] Open the Env Diff modal from the Composer Publish button, toggle includes, dismiss
- [x] Switch role on Preview-as-Role and see the impersonated preview change
- [x] Bulk-select users and see the BulkActionBar appear
- [x] Type in any filter or search and see URL state update
- [x] Hit Esc from any overlay and return focus
- [x] Run the V6 + V8 + V9 scrubs and see them pass
- [x] No mention of Claude / Anthropic / OpenAI / GPT anywhere in `apps/admin/`

## 12. Handoff after this build

When JP confirms the local build is good:
1. Generate CF deploy artifacts for `apps/admin/` (Dockerfile + manifest.yml + GitHub Actions workflow), mirroring the pattern in `apps/portal/Dockerfile`.
2. New CF app name: `ust-ai-suite-plus-sap-admin`.
3. New route: `ust-ai-suite-plus-sap-admin.cfapps.us10-001.hana.ondemand.com` (or custom domain later).
4. Image: `ghcr.io/ust-account/ust-ai-suite-plus-sap-admin`.
5. Same GitHub Actions secrets (`CF_API`, `CF_USERNAME`, `CF_PASSWORD`, `CF_ORG`, `CF_SPACE`).
6. JP does the migration via GitHub Desktop, same 5-step flow as portal.

Phase 6 deploy is out of scope for this build per JP.
