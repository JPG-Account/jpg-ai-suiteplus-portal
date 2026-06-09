# UST AI Suite+ for SAP — Admin Page Plan

> Synthesis of four specialist perspectives (SaaS Architect, Enterprise Architect, Security Admin, Web UI/UX Specialist) into one buildable plan. **Configure the entire Suite+ site without writing a single line of code.**

## 1. Executive summary

The Suite+ Admin is a calm, desktop-first **control plane** that lets a non-developer administrator manage every dimension of the portfolio — the landing page, the audience lanes, the eight (and growing) capability apps, who can access what, and which SAP systems Suite+ talks to — without touching the repo. It's the quieter sibling of the public portal: same UST teal + black + white face, same Inter type, but denser tables, a persistent left rail, drawers instead of route changes, and autosave everywhere except `Publish`. Identity is delegated to **SAP IAS** (no local accounts), provisioning is delegated to **SAP IPS** via SCIM, secrets live in **BTP Credential Store** + **BTP Destination Service**, audit lands in **BTP Audit Log Service** + **SAP Cloud ALM**, and configuration is persisted in **SAP HANA Cloud** with an immutable revision history and a draft → preview → publish → rollback lifecycle. The public portal stays content-only; the Admin is a separate Cloud Foundry app sharing only the HANA schema. YAML in the repo becomes a generated *export*, not the master.

## 2. Personas

| Persona | Goal | Primary screens |
|---|---|---|
| **Suite Admin** (UST SAP GTM lead) | Day-to-day platform owner — adds capabilities, edits landing, configures integrations | Site Builder · Capabilities · Integrations |
| **Content Admin** (a designated PM or marketer) | Drafts landing-page changes; cannot publish | Site Builder (draft mode) |
| **Content Approver** (governance owner) | Reviews drafts; publishes to prod | Approvals · Site Builder (review mode) |
| **Capability Owner** (e.g., RIA lead) | Owns one app's tile, route, lane assignment | Capabilities (scoped) |
| **Auditor** (security / compliance) | Forensic read of who did what | Audit log · Users |
| **Super Admin** (break-glass) | 2 named individuals; time-boxed elevation | Everything · 8h auto-expiry |
| **Viewer** (default) | Authenticated end-user, no admin access | n/a — sees portal only |

## 3. Information architecture

The admin sitemap (final V0 shape):

```
Overview                       (dashboard)

Site Builder
  ├─ Landing page              (WYSIWYG canvas)
  ├─ Capability tiles          (route editor — the "hyperlinks for tiles" requirement)
  ├─ Lanes                     (taxonomy + ordering)
  ├─ Branding & theme          (token picker — locked to UST palette)
  └─ Media library

Capabilities                   (the 8 apps)
  ├─ Catalog & visibility
  ├─ Per-capability settings
  └─ Feature flags

People & Access
  ├─ Users                     (read-only from IAS · scope = view + assign Suite+ role)
  ├─ Groups → Roles mapping    (the actual control surface)
  ├─ Roles & permissions
  ├─ SSO & SCIM status
  └─ Access requests

Integrations
  ├─ SAP services              (IAS, IPS, Destinations, Cloud ALM, Build, Signavio)
  ├─ Notification channels     (email, Teams)
  └─ Telemetry & logging

Governance
  ├─ Audit log
  ├─ Change approvals          (dual-control queue)
  ├─ Content safety            (the existing data-safety checklist as a live control)
  ├─ Data residency            (CF us10 attestation)
  └─ Legal pages

Observability
  ├─ Usage & adoption
  ├─ Health & uptime
  └─ Cost & quota

Developer
  ├─ API keys
  ├─ Webhooks
  ├─ Environments              (dev / stage / prod)
  └─ Export & backup           (HANA → YAML round-trip)
```

## 4. Core architectural decisions

| # | Decision | Owner | Why |
|---|---|---|---|
| A1 | **Admin is a separate Cloud Foundry app** (`ust-ai-suite-plus-sap-admin`) on `code_migration_space`, sharing only the HANA schema with the public portal. | SaaS + Security | Public CVE ≠ admin breach. Smaller attack surface. Independent scale/deploy. |
| A2 | **SAP HANA Cloud is the config source of truth.** YAML in the repo becomes a nightly generated export for git-as-backup. | SaaS + Enterprise | Non-devs cannot edit YAML. HANA gives versioning, RBAC, audit, transactional publishes. |
| A3 | **Draft → Preview → Publish → Rollback** lifecycle. Every publish creates an immutable `config_revision`; rollback flips a pointer in <5s. | SaaS | First-class enterprise SaaS contract. No "edits to live" — ever. |
| A4 | **The public portal reads from `/config/current.json`** in BTP Object Store via ISR (60s revalidate). No HANA query in the request path. | SaaS | Public portal stays fast, stateless, no DB coupling. |
| A5 | **SAP IAS is the only identity provider.** No local passwords; no break-glass local account. | Security + Enterprise | Aligns NIST 800-53 IA-2. If IAS is down, admin is down — correct posture. |
| A6 | **SAP IPS pushes SCIM 2.0 to Suite+** for joiner/mover/leaver. Suite+ never invents users. | Enterprise + Security | Auto-deprovision <15 min. No orphan admins. |
| A7 | **Suite+ roles are mapped to IAS groups, never to users directly.** Admin manages the *mapping*, not the user. | Enterprise | Don't re-skin identity. IAS already has the user UI. |
| A8 | **Tiles use a Capability Registry + Deep-Link Template, not raw URLs.** Resolver fuses BTP Destination + template + IAS token at click time. | Enterprise | Destination URL change does not require admin edit. Solves the "hyperlinks" requirement properly. |
| A9 | **Dual-control approval required** for: role grants (Admin tier), integration config, prod publish, secret rotation. | Security | Separation of duties (AC-5). No single-actor production change. |
| A10 | **All admin mutations emit to BTP Audit Log Service + Cloud ALM** with before/after hashes. 2y hot + 7y cold retention. | Security + Enterprise | ISO 27001 A.12.4 + SOX alignment. |
| A11 | **No WYSIWYG hex pickers.** Theme is locked to UST tokens. | UX | Admins will paste hex and break the face. |
| A12 | **Autosave everywhere; explicit Save only on `Publish`.** | UX | Modern enterprise contract. Removes "dirty state" bugs. |

## 5. Security model

### RBAC (final V0 roles)

| Role | Description | Scope shape |
|---|---|---|
| **Super Admin** | Break-glass only, 2 named individuals | `*:*` · auto-expires 8h · step-up MFA required |
| **Suite Admin** | Day-to-day platform owner | `site:configure`, `capabilities:configure`, `integrations:configure`, `roles:assign` (non-admin), `audit:read` |
| **Content Admin** | Drafts landing edits | `content:draft`, `content:submit-for-approval` — **no** `content:publish` |
| **Content Approver** | Reviews & publishes | `content:review`, `content:publish`, `content:read` |
| **Capability Owner** | Scoped to one app | `capability:{id}:configure`, `capability:{id}:read` |
| **Auditor** | Read-only forensics | `audit:read`, `users:read`, `config:read` |
| **Viewer** | Authenticated end-user | `showcase:read` only |

Scope grammar: `resource:action[:qualifier]`. No role inherits `*` except Super Admin. Authorization is server-side middleware on every API route — never UI-gated alone.

### Audit log

- **Captured events** — authn (login, MFA, step-up, failure, lockout), authz-deny, every mutation: `user.provisioned · role.granted/revoked · integration.configured · secret.rotated · content.published · approval.requested/granted/denied · session.elevated · export.generated`.
- **Schema** — `event_id, ts, actor_id, actor_role, source_ip, user_agent, action, resource_type, resource_id, before_hash, after_hash, request_id, approval_id?, outcome`.
- **Retention** — 2 years hot in BTP Audit Log Service, 7 years cold in BTP Object Store, SHA-256-chained.
- **Read access** — Auditor + Super Admin only.
- **Export** — signed NDJSON, vendor-neutral field names. Never references model providers.

### Change-approval workflow

Four action classes require **dual-control** (requester ≠ approver, step-up MFA at approval, justification text ≥ 20 chars):

1. Role grants to Suite/Content/Capability Admin
2. Integration config changes (endpoints, destinations, scopes)
3. Content publish to prod
4. Secret rotation in prod

Single sign-off: viewer role grants, draft content edits. Break-glass Super Admin elevation: post-hoc review within 24h by second Super Admin, else auto-revoked.

### Defense baseline

- **Headers** — strict CSP (`default-src 'self'`, nonce on inline), HSTS, `SameSite=Strict` cookies, double-submit CSRF tokens.
- **WYSIWYG XSS** — server-side sanitization (DOMPurify-equivalent), allow-list HTML, render with CSP nonce.
- **Hyperlink editor** — domain allow-list + warn-on-external interstitial. Defeats open-redirect / phishing pivots.
- **Secrets** — BTP Credential Store (admin secrets) + BTP Destination Service (integration secrets). Zero secrets in env vars, code, or Git.
- **IP allow-list** for `/admin/*` (V1) via BTP API Management — corporate egress + named VPN.

## 6. Integration model

| System | Owner | Suite+ does | Suite+ does NOT do |
|---|---|---|---|
| **SAP IAS** | Identity | Consume OIDC ID tokens; map IAS groups → Suite+ roles | Store passwords, manage MFA policy, run user CRUD |
| **SAP IPS** | Provisioning | Receive SCIM 2.0 push of users/groups | Originate user lifecycle events |
| **BTP Destination Service** | Egress contracts | Browse + reference Destinations by name | Store URLs, client secrets, mTLS certs |
| **BTP Connectivity / Cloud Connector** | On-prem reach | Use for FlexIOM-style on-prem apps | Maintain tunnels |
| **SAP Cloud ALM** | Observability | Ship audit events, health, SLO telemetry | Define SLOs |
| **SAP Build** | Extensions | Deep-link out to no-code extension surfaces | Rebuild form builders |
| **SAP Signavio** | Process governance | Link admin workflows (onboarding a capability, etc.) to Signavio processes | Author processes |

### Capability federation model (the "hyperlinks for tiles" requirement, done right)

A capability app self-describes via a signed manifest at `/.well-known/suiteplus-capability.json`:

```json
{
  "id": "ria",
  "name": "Rapid Impact Analyzer",
  "primaryLane": "AI for Developers",
  "deepLinkTemplate": "/assessment/{tenantId}/{id}",
  "destinationName": "ria-prod",
  "requiredScopes": ["ria.read", "ria.write"],
  "healthEndpoint": "/api/health",
  "manifestVersion": "1"
}
```

The admin registers the capability once. Tiles in the Site Builder reference the capability + a template — never a raw URL. At click time, the resolver fuses the BTP Destination's current base URL with the template, attaches an IAS-issued ID token, and redirects. Destination URL changes do not require admin edits. Deregistration is a state transition (`active → deprecated → archived`), never a hard delete, so old audit log links resolve forever.

## 7. Data model (Suite+-owned entities)

| Entity | Purpose | Key fields |
|---|---|---|
| `config_revision` | Immutable config snapshot | `id, parent_id, status (draft|preview|published|archived), bundle_hash, author_id, created_at, published_at` |
| `lane` | Audience lane | `id, slug, name, sort_order, revision_id, payload` |
| `capability` | Registered capability app (CAR) | `id, slug, name, manifest_url, destination_name, deep_link_template, lane_ids[], required_scopes[], state, revision_id` |
| `tile` | A tile rendered on the landing | `id, capability_id, label, description, icon_ref, lane_id, route_template_override?, audience_roles[], revision_id` |
| `page_block` | WYSIWYG content block on the landing | `id, kind (hero|grid|story|cta|footer|...), props (jsonb), order, parent_block_id, revision_id` |
| `role` | Suite+ RBAC role | `id, name, description, scopes[]` |
| `role_mapping` | IAS group → Suite+ role | `id, ias_group_id, role_id, expires_at?` |
| `feature_flag` | Server-side flag | `key, environment, lane_id?, enabled, rollout_pct, revision_id` |
| `integration` | Bound to a BTP Destination + intent | `id, kind, destination_name, config (jsonb), state, revision_id` |
| `approval` | Change request | `id, action_kind, requester_id, approver_id?, payload, justification, state, decided_at?` |
| `audit_event` | Append-only event log | `event_id, ts, actor_id, actor_role, action, resource_*, before_hash, after_hash, outcome` |

## 8. API surface (V0)

```
GET    /api/admin/revisions                            list revisions, filter by status
POST   /api/admin/revisions                            create draft from current
PATCH  /api/admin/revisions/:rid/entities/:type/:id    edit lane / capability / tile / block / flag
POST   /api/admin/revisions/:rid/preview               mint preview JWT
POST   /api/admin/revisions/:rid/publish               atomic publish + audit
POST   /api/admin/revisions/:rid/rollback              repoint pointer

GET    /api/admin/users                                read-only from IAS (paginated)
GET    /api/admin/groups                               IAS groups available
POST   /api/admin/role-mappings                        map IAS group → role (requires approval)
GET    /api/admin/roles                                roles + scopes

GET    /api/admin/integrations                         list integrations + Destination status
POST   /api/admin/integrations                         bind a Destination (requires approval)

GET    /api/admin/approvals                            queue (filter by mine / pending / decided)
POST   /api/admin/approvals/:id/decide                 approve | reject + justification

GET    /api/admin/audit                                paginated, filterable, exportable
GET    /api/admin/audit/export                         signed NDJSON

GET    /api/admin/capabilities/:id/manifest            re-fetch + validate signed manifest
POST   /api/admin/capabilities                         register a new capability
POST   /api/admin/capabilities/:id/state                active | deprecated | archived

GET    /config/current.json                            PUBLIC, cached, what the portal reads
POST   /api/webhooks/test                              test outbound webhook
```

All mutating endpoints carry an `If-Match: <etag>` header for optimistic concurrency.

## 9. UX patterns

- **Chrome** — persistent 240px left rail (collapsible to 64px), 56px top bar (breadcrumb · env switcher · search · avatar), sticky action bar per page.
- **Routing** — every page has a URL; back button works; drawers are URL-addressable (`?drawer=user:U123`).
- **Drawers (560px right-side)** — for quick edits (tile route, user role, integration config). Detail pages only for multi-section configuration (SSO, branding).
- **Autosave + dirty indicator** — "Saved 2s ago" pill replaces a Save button when clean. **Only `Publish` is explicit.**
- **Undo toast (8s)** — after every destructive action.
- **Optimistic UI** — toggles, reorders, role chips — with rollback toast on failure.
- **Keyboard** — `⌘K` global palette, `g d` dashboard, `g u` users, `n` new, `/` focus search, `esc` close drawer.
- **Inline edit** — safe cells only (name, description). Anything destructive opens a drawer.
- **Empty / loading / error** — skeleton rows (never spinners), helpful empty states with CTAs, errors with "Retry" + "Copy error ID" (never a dead screen).

## 10. Phased build plan

### V0 — Minimum lovable admin (5–7 weeks, revised after critique)

**Goal:** "no-code site configuration" is true for landing + tiles + lanes + role mapping + the operational screens an admin lives in. Marketers can ship campaigns; admins can find and fix what broke.

| # | Feature | Decision refs |
|---|---|---|
| V0.1 | New CF app `ust-ai-suite-plus-sap-admin`, separate route, HANA schema | A1 · A2 |
| V0.2 | SAP IAS OIDC login, MFA enforced, IAS group → role mapping engine | A5 · A6 · A7 |
| V0.3 | Config revision model + draft/publish/rollback + `/config/current.json` | A2 · A3 · A4 |
| V0.4 | **Site Composer** — structured form editor with read-only live preview (replaces free-form WYSIWYG canvas) | A11 · A12 · D1 |
| V0.5 | Capability tile editor (drawer) — registry-based, never raw URL | A8 |
| V0.6 | Lanes — list view + drag-reorder + drawer edit | — |
| V0.7 | Users (read-only) + Groups → Roles mapping (with approval gate) | A9 · D5 |
| V0.8 | Roles & permissions — view + edit (scope grammar) · per-capability ACL | A9 · D5 |
| V0.9 | Audit log — list + saved filters + drawer detail + NDJSON export | A10 |
| V0.10 | **Approvals Inbox** — dual-control queue · SLA timer · delegation · OOO routing · comments | A9 · D6 |
| V0.11 | Integrations — BTP Destination browser, bind/unbind, test-connection, health status | — |
| V0.12 | YAML export job (nightly, CI-committed to canonical repo) | A2 |
| V0.13 | **Action-oriented Dashboard** — replaces vanity KPIs with the admin to-do list | D2 |
| V0.14 | **Site Health & Broken Links** — per-tile manifest health · last-known-good route · per-tile rollback | D3 |
| V0.15 | **Redirects + SEO Hub** — 301/302 table · CSV import · site default + per-page SEO (title, desc, OG, canonical) · sitemap.xml status | D3 |
| V0.16 | **Snippets Library** — reusable global blocks (footer disclaimer, CTAs) · usage tracking · edit-once-propagate | D3 |
| V0.17 | **Schedule & Calendar** — publish-at / unpublish-at on any artifact · calendar view | D3 |
| V0.18 | **Preview-as-Role / Impersonation** — render the portal as a target IAS group or role | D4 |
| V0.19 | **SCIM Sync Errors** — dedicated screen + dashboard widget | D8 |
| V0.20 | **Environment Diff** — Draft vs Prod side-by-side before Publish | D2 |
| V0.21 | **Share Preview Link** — sendable JWT preview for non-admin reviewers (Legal, VPs) | D3 |
| V0.22 | **A11y linter pre-publish** — contrast · alt text · heading order · blocks Publish on critical | D3 |

### V1 — Scale & extensibility (next 4–6 weeks)

| # | Feature |
|---|---|
| V1.1 | SCIM 2.0 inbound endpoint (IPS push) |
| V1.2 | Outbound webhooks on publish (`tile.published`, etc.) |
| V1.3 | Power-user REST + OData read API |
| V1.4 | Per-environment overrides (dev / stage / prod) |
| V1.5 | Anomaly detection on audit stream (impossible travel, off-hours, bulk grants) |
| V1.6 | Quarterly access recertification |
| V1.7 | IP allow-list for `/admin/*` via BTP API Management |
| V1.8 | Feature flags UI (server-side eval, % rollout, per-lane) |
| V1.9 | Capability auto-registration via `.well-known/suiteplus-capability.json` |
| V1.10 | DPIA + cookie/consent banner + GDPR Art. 15/17 endpoints |
| V1.11 | **Content Types** — News · Case Studies · Events · Webinars (typed collections beyond landing) |
| V1.12 | **Navigation editor** — header + footer + mega-menu |
| V1.13 | **Forms & Submissions** — form builder + inbox + outbound webhook to CRM Destination |
| V1.14 | **Site Search config** — synonyms · boosts · no-result fallback · suggested queries |
| V1.15 | **Banners / announcements** — scheduled · dismissible · lane-targeted |
| V1.16 | **Block-level visibility rules** — by lane · auth state · date window |
| V1.17 | **Media library upgrades** — alt/caption/license fields · auto-variants (AVIF/WebP/responsive) · usage map · DAM-style replace-in-place |
| V1.18 | **Inline comments / review threads** on blocks (Sanity-style) |
| V1.19 | **Core Web Vitals dashboard** — tied to publishes |
| V1.20 | **Secrets & Rotation Console** — list · expiry · rotate (dual-controlled) |
| V1.21 | **Approval delegation rules** — calendar-aware OOO routing |
| V1.22 | **Content health / staleness report** — last-reviewed dates · auto-archive policy |

### V1.5 — Globalization

- i18n / locales / hreflang
- Per-locale routing + fallback rules
- Translation memory + glossary

### V2 — Differentiation

- Scheduled publishes via BTP Job Scheduler
- Multi-environment promotion (dev → stage → prod) via Cloud ALM transport-like flow
- Signavio process attachment per admin workflow
- Read-only Joule callable tools ("show tiles with failing health")
- Capability App marketplace (sub-tenant model)
- Sub-portal mode (per-business-unit branding)
- A/B testing on blocks (gated behind Content Types from V1.11)
- Model-generated media tagging in the Media library (neutral term; no vendor name)

## 11. Risks ranked

| # | Risk | Mitigation |
|---|---|---|
| R1 | **WYSIWYG = stored XSS vector** | Server-side sanitize, allow-list HTML, render with CSP nonce, no `<script>`/`on*` |
| R2 | **Hyperlink editor = open redirect** | Domain allow-list, warn-on-external, never raw URL on tiles (use registry template) |
| R3 | **SCIM deprovision lag** | Liveness probe + alert on >30min gap; dual-control on admin grants |
| R4 | **YAML / HANA drift** | YAML becomes generated export only; PRs that touch YAML auto-fail |
| R5 | **CF rolling deploy + config cache** | Bundle-hash header, 60s acceptance window in monitoring, publish event bus in V1 |
| R6 | **IAS group claim size limits** | Use group prefixes for mapping, not full lists |
| R7 | **Audit in same tenant** | Ship to separate BTP subaccount + external SIEM |
| R8 | **Vendor-name leaks via stack traces** | Strip framework fingerprints, custom error pages, sanitize provider IDs in logs |
| R9 | **Table density at 10k users** | Virtualize from day one |
| R10 | **Local admin accounts as breach vector** | Don't ship any. IAS-only. Break-glass = post-hoc reviewed, time-boxed elevation |

## 12. Definition of done — V0

- [ ] Suite Admin can change a tile's destination + see it reflected on `https://ust-ai-suite-plus-sap.cfapps.us10-001.hana.ondemand.com` within 60s, no engineering involvement.
- [ ] Content Admin can edit the landing-page hero copy, submit for approval, and a Content Approver can publish.
- [ ] An IAS group → Suite Admin role grant requires dual-control and is fully audited.
- [ ] Every state-changing action emits a structured event to BTP Audit Log Service.
- [ ] Zero vendor names of AI providers appear in any rendered UI, exported audit, or log line.
- [ ] All 4 hard rules (canonical UST repo · no vendor names · BTP CF only · history-scrubbed migrations) are enforced or non-applicable.
- [ ] Mock approved by JP (`apps/portal/mocks/admin-v0.html`).

## 13. Critique synthesis (after Webapp Admin + Web Builder red-team)

| Reviewer | Score | Verdict |
|---|---|---|
| Webapp Admin | 6.5 / 10 | "Bones right; showcase, not workbench. Five screens cannot run 8 capabilities + 412 SCIM users + dual-control gates." |
| Web Builder | 4 / 10 | "Page-builder demo, not a site. Promise is no-code; reality is no-code-homepage-then-file-a-ticket." |

Both independently recommended **killing the free-form WYSIWYG**; the synthesis is **D1. Site Composer = structured form editor with read-only live preview.** No drag-drop on the canvas; up/down/move-to controls on a typed block list; drag-drop survives only on the tile-order list (low blast radius). This pivots V0.4 without dropping the "no-code" promise.

The **action-oriented Dashboard (D2)** replaces vanity KPIs with: things requiring my action (SLA-aged approvals) · SCIM errors 24h · Tiles failing health · Stale drafts · Secrets expiring 30d · Recent prod publishes with inline Rollback. Adoption moves to Observability where it belongs.

**Five new screens enter V0:** Approvals Inbox · Site Health & Broken Links · Redirects + SEO Hub · Snippets Library · Schedule & Calendar. Plus three V0 controls: Preview-as-Role · SCIM Sync Errors · Environment Diff · Share Preview Link · A11y linter.

**Deferred but acknowledged:**

| Reviewer asked for | V-line | Why deferred |
|---|---|---|
| Forms & Submissions | V1.13 | Needs Destination outbound to CRM first |
| Content Types (News, Case Studies, Events) | V1.11 | Data model accommodates now; UI later |
| Navigation editor | V1.12 | Single-nav assumption survives V0 |
| Site Search config | V1.14 | Search itself is V1; config follows |
| Banners / announcements | V1.15 | Easy to bolt on; not a V0 blocker |
| i18n / locales / hreflang | V1.5 | Single-language assumption survives V0 |
| A/B testing on blocks | V2 | Premature without Content Types |
| Inline comments on blocks | V1.18 | Approvals Inbox closes the urgent path |

## 14. Mock spec

A standalone, scrollable HTML mock at `apps/portal/mocks/admin-v0.html` showing five vertically-stacked screens at high fidelity, matching the public portal's design face (UST teal + black + white · Inter · shadow + radius tokens · subtle animation):

1. **Admin shell + Dashboard** — left rail with full IA, top chrome (breadcrumb + env switcher + search + avatar), 3-column widget grid (Site health · Adoption · Pending approvals · Recent audit · Open access requests).
2. **Site Builder — Landing page WYSIWYG** — three-pane (palette · canvas · properties), draft/preview/publish bar, autosave indicator.
3. **Capability Tile Editor** — sortable table + the drawer open showing the "Route" radio (Internal · External · Coming-soon) — the literal answer to "hyperlinks for the tiles".
4. **Users & Roles (Groups → Roles mapping)** — dense table + role chips + invite/role-assign drawer.
5. **Audit log** — virtualized event stream with filters and a drawer showing the full event payload.

Each screen is a complete, pixel-considered design. No Lorem ipsum — sample data uses Suite+'s real lanes, capabilities, and roles.
