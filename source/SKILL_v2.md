# UST AI Suite+ for SAP — Skill Charter

## Purpose

This skill governs how to plan, describe, organize, and migrate the UST AI Suite+ for SAP body of work from JP's private GitHub environment into an approved UST-owned repository.

The goal is not to move code blindly. The goal is to turn JP-created UST SAP innovation projects into a governed, reusable, UST-owned capability portfolio that can be maintained by multiple contributors and used safely by Client Partners, Account Managers, SAP practitioners, solution teams, and innovation teams.

## One-line charter

UST AI Suite+ for SAP is a UST SAP capability showcase and execution portfolio that brings together AI-enabled accelerators, SAP-focused solution assets, practical business tools, and industry demos into one organized, governed, and reusable UST repository.

## Current scope

The initial scope includes the UST SAP projects JP created in his private GitHub repo:

1. Rapid Impact Analyzer, also called RIA
2. Client University
3. Rapid Assessment
4. ROI Calculator
5. Trade Promotion Optimizer
6. CX for Life Sciences
7. CX for Insurance
8. FlexIOM

Future projects may be added only through the intake and governance process defined in this skill.

## What this is

UST AI Suite+ for SAP is:

- A UST SAP capability portfolio
- A showcase page for UST SAP AI and non-AI solution assets
- A governed repository structure for multiple UST SAP projects
- A reusable sales, solutioning, and demo foundation
- A way to organize UST SAP innovation work by audience, business need, and capability
- A practical path to move private innovation assets into UST-owned, team-maintainable code and content

## What this is not

UST AI Suite+ for SAP is not:

- A claim that every included solution is AI
- A SAP-owned product
- A replacement for SAP products, SAP tools, SAP BTP, SAP Build, SAP Signavio, SAP Cloud ALM, SAP Joule, or other SAP-native capabilities
- A dumping ground for every prototype or demo
- A place to store customer confidential information
- A place to mix JP's private non-UST IP, ClarisTXM IP, or personal startup assets with UST work
- A production client implementation repository unless explicitly approved by UST governance

## Primary audience

This skill should help produce work that is useful for:

- UST Client Partners
- UST Account Managers
- UST SAP GTM leaders
- UST SAP solution teams
- UST SAP architects and consultants
- UST SAP Innovation Lab contributors
- UST delivery and AMS teams
- SAP stakeholders who need to understand how UST capabilities can support SAP-led transformation

## Positioning principle

Always keep the language honest.

Say:

> UST AI Suite+ for SAP brings together AI-enabled accelerators, SAP-focused solution assets, value tools, industry demos, and practical enablement capabilities for SAP-led transformation.

Do not say:

> UST AI Suite+ for SAP is a complete autonomous enterprise platform that replaces SAP-native tools.

Do not imply SAP endorsement, SAP ownership, or SAP product equivalence.

## Portfolio lane model

Organize the portfolio by audience lane. Do not use ABCDEF+ as the primary grouping.

| Lane | Audience | Purpose |
|---|---:|---|
| AI for Executives | CIO, CFO, COO, Transformation leaders | Decision visibility, value, risk, prioritization |
| AI for Architects | Enterprise, Solution, Integration, Data Architects | Architecture impact, modernization options, standards alignment |
| AI for Business | Process owners, operations leaders, super users | Business process improvement and daily decision support |
| AI for Consultants | Functional consultants, PMO, BAs, SMEs | Faster analysis, workshops, documentation, delivery assets |
| AI for Developers | Developers, technical leads, QA | Code, test, transport, object, and release quality |
| AI for Ops | AMS, ITSM, support, service owners | Reduce incidents, debt, MTTR, recurring work |
| AI for Governance | Risk, compliance, audit, security | Control, evidence, compliance, policy adherence |
| AI for Finance | CFO, finance ops, value office | Business case, cost, value tracking |
| AI for Industry / Domain | Industry leaders, domain SMEs | Specialized accelerators by sector |

Each solution must have:

- One primary lane
- Optional secondary lanes
- A clear solution type
- A maturity status
- A named owner
- A short client-facing description
- A plain-language use case

## Initial solution mapping

| Solution | Primary lane | Secondary lanes | Type |
|---|---|---|---|
| RIA | AI for Developers | AI for Architects, AI for Consultants, AI for Ops, AI for Governance | AI-assisted impact analyzer |
| Client University | AI for Ops | AI for Business, AI for Consultants | Enablement and knowledge solution |
| Rapid Assessment | AI for Consultants | AI for Executives, AI for Architects, AI for Governance | Assessment accelerator |
| ROI Calculator | AI for Finance | AI for Executives, AI for Consultants | Calculator and value tool |
| Trade Promotion Optimizer | AI for Industry / Domain | AI for Business, AI for Finance | Industry accelerator |
| CX for Life Sciences | AI for Industry / Domain | AI for Business, AI for Executives | Industry solution |
| CX for Insurance | AI for Industry / Domain | AI for Business, AI for Executives | Industry solution |
| FlexIOM | AI for Business | AI for Industry / Domain, AI for Executives | SAP solution accelerator |

## Migration goal

Move JP-created UST SAP projects from JP's private GitHub repo into a UST-owned repo in a way that preserves value and improves maintainability.

The migration must achieve four outcomes:

1. UST ownership and continuity
2. Clear structure for multiple teams to contribute
3. Separation of shared platform assets from solution-specific code
4. Removal of anything not approved for UST repository use

## Recommended repository model

Use a monorepo, but structure it as a governed platform. Do not keep adding unrelated projects into one large application.

Recommended structure:

```text
ust-ai-suite-plus-sap/
  apps/
    portal/
    ria/
    client-university/
    rapid-assessment/
    roi-calculator/
    trade-promotion-optimizer/
    cx-life-sciences/
    cx-insurance/
    flexiom/

  packages/
    ui/
    ust-icons/
    design-tokens/
    solution-registry/
    auth/
    data-contracts/
    ai-client/
    analytics/

  config/
    lanes.yaml
    solutions.yaml
    feature-flags.yaml

  infra/
    btp/
    github-actions/
    env/

  docs/
    architecture/
    onboarding/
    governance/
    solution-cards/
    release-notes/

  CODEOWNERS
  README.md
  CONTRIBUTING.md
  SECURITY.md
```

## Repository design rules

1. `apps/` contains independently understandable solution apps.
2. `packages/` contains reusable assets only.
3. `config/solutions.yaml` is the source of truth for the showcase page.
4. `config/lanes.yaml` is the source of truth for the audience lane model.
5. Each solution owns its own route, data model, demo content, and documentation.
6. Shared packages must be reviewed more strictly than app-level changes.
7. No app may silently depend on another app's private logic.
8. No customer data, credentials, secrets, or private commercial material may be committed.
9. AI prompts, AI workflows, and generated outputs must be reviewed for UST and client safety.
10. Every new solution must pass intake before appearing on the landing page.

## Migration stages

### Stage 1 — Inventory

Create an inventory of all current private-repo assets.

Capture:

- Project name
- Current path
- Business purpose
- Primary audience lane
- Technical owner
- Business owner
- Maturity
- Dependencies
- Data used
- Demo readiness
- Security concerns
- Whether the asset is UST-safe to move

### Stage 2 — Classify

Classify each asset as one of the following:

- Move as-is
- Move after cleanup
- Move as reference only
- Rewrite before moving
- Do not move

### Stage 3 — Sanitize

Remove or replace:

- Customer names and confidential details
- PII
- Credentials, tokens, endpoints, private keys, and environment values
- Commercial pricing, margins, pursuit strategy, or deal-specific information
- ClarisTXM, personal startup, or non-UST private IP
- Internal notes not suitable for a UST-owned repo
- Screenshots or sample data that may expose sensitive information

### Stage 4 — Repackage

Repackage each project into the monorepo structure.

Minimum package for each app:

```text
apps/<solution>/
  README.md
  src/
  public/
  tests/
  docs/
    overview.md
    demo-script.md
    data-notes.md
    known-limitations.md
```

### Stage 5 — Register

Add each approved solution to:

```text
config/solutions.yaml
```

Each solution registry entry must include:

- id
- name
- shortName
- primaryLane
- secondaryLanes
- type
- status
- route
- owner
- description
- useCases
- tags
- enabled

### Stage 6 — Review

Before merging into UST's repo, run reviews for:

- Business fit
- Security and privacy
- Code quality
- Repo structure
- Client-facing copy
- SAP positioning safety
- Demo readiness
- Maintainability

### Stage 7 — Publish internally

After review, publish the solution internally as part of UST AI Suite+ for SAP.

The first release does not need to be perfect. It must be clear, safe, structured, and maintainable.

## Intake checklist for new projects

Every future project must provide:

1. Solution name
2. Business problem
3. Target users
4. Primary lane
5. Secondary lanes
6. Solution type
7. AI classification: AI-enabled, AI-assisted, non-AI, or unclear
8. Current maturity: concept, prototype, demo, live, available, retired
9. Demo scenario
10. Data classification
11. Required integrations
12. Technical owner
13. Business owner
14. Screenshots or demo images
15. Client-facing description
16. Internal-only notes, if any
17. Security review status
18. Known limitations
19. Route or intended location
20. Support model

## Definition of done for migration

A migrated solution is done when:

- It lives under the correct `apps/` path
- It has a clean README
- It uses shared UST design tokens where practical
- It does not contain prohibited data
- It has a clear solution owner
- It has a registry entry
- It appears correctly on the showcase page if enabled
- It can be built or previewed independently
- It has demo instructions
- It has known limitations documented
- It has passed business, security, and code review

## Copy and messaging rules

Use plain, seller-friendly language.

Preferred style:

- Direct
- Client-safe
- Practical
- Outcome-oriented
- SAP-compatible without implying SAP endorsement
- Useful for Client Partners and Account Managers

Avoid:

- Hype
- Overpromising
- Internal notes
- Developer jargon in client-facing sections
- Claims that everything is autonomous or AI-powered
- Claims that UST tools replace SAP products
- Unverified metrics
- Unapproved customer examples

## Approved positioning language

Use this as the default:

> UST AI Suite+ for SAP brings together UST SAP AI-enabled accelerators, assessment tools, business calculators, industry demos, enablement capabilities, and SAP solution assets in one organized showcase. It helps teams connect client needs to the right capability, start better conversations, and move from interest to practical next steps.

Short version:

> UST AI Suite+ for SAP helps UST teams position the right SAP capability for the right client need.

## Prohibited content

Do not migrate or publish:

- Customer confidential information
- PII
- SOX-sensitive evidence
- Security vulnerabilities
- Credentials or secrets
- Internal pursuit notes
- Commercial pricing or margin details
- Client-specific screenshots unless approved and sanitized
- Unapproved SAP logos or SAP branding assets
- Content implying SAP endorsement
- ClarisTXM private IP or personal startup assets
- Non-UST assets without approval

## Governance roles

| Role | Responsibility |
|---|---|
| JP / UST SAP GTM lead | Portfolio direction, solution fit, positioning, prioritization |
| Platform owner | Repo structure, portal, shared components, registry, build consistency |
| Solution owner | Solution logic, demo readiness, use case description, documentation |
| Technical owner | Code quality, maintainability, dependencies, tests |
| Security / compliance reviewer | Data safety, secrets, policy alignment |
| Design / brand reviewer | UST visual standard and client-facing quality |
| SAP positioning reviewer | Ensures language is SAP-compatible and does not imply SAP ownership or replacement |

## Working principles

1. Move value, not mess.
2. Preserve the intent, improve the structure.
3. Keep the showcase simple for sellers.
4. Keep the codebase clear for contributors.
5. Keep client-facing copy honest.
6. Separate UST work from JP's personal or ClarisTXM work.
7. Make every solution discoverable by audience lane.
8. Make every solution independently maintainable.
9. Treat shared packages as platform assets.
10. Keep the first UST version simple, safe, and expandable.

## Default assistant behavior when this skill is used

When asked to help with UST AI Suite+ for SAP, the assistant should:

1. Route the work to UST SAP GTM unless the user explicitly requests another context.
2. Keep UST, JP private repo, and ClarisTXM contexts separate.
3. Ask whether the output is client-facing or internal if the distinction matters.
4. Use the lane model defined in this skill.
5. Treat the current eight projects as the initial portfolio unless the user adds or removes projects.
6. Recommend a monorepo structure for the UST repo unless the user asks for a different architecture.
7. Avoid internal notes in client-facing artifacts.
8. Avoid technical language in seller-facing showcase pages.
9. Label unknowns clearly.
10. Create practical migration artifacts, not abstract strategy.

## Common outputs this skill should produce

This skill can be used to create:

- Repo migration plan
- Project inventory table
- Solution registry file
- Lane registry file
- Monorepo folder blueprint
- CODEOWNERS draft
- README draft
- CONTRIBUTING guide
- Governance checklist
- PR checklist
- Solution card copy
- Internal charter
- Client-safe showcase copy
- Migration issue backlog
- Release plan
- UST AI Suite+ for SAP landing page content

## Starter repo files to create

Minimum recommended files for UST repo setup:

```text
README.md
CONTRIBUTING.md
SECURITY.md
CODEOWNERS
config/lanes.yaml
config/solutions.yaml
docs/charter.md
docs/governance/migration-checklist.md
docs/governance/client-data-safety.md
docs/onboarding/add-a-new-solution.md
docs/architecture/repo-structure.md
```

## Initial migration backlog

1. Create UST target repo or rename the current UST repo if approved.
2. Create platform folder structure.
3. Add `config/lanes.yaml`.
4. Add `config/solutions.yaml`.
5. Create UST AI Suite+ for SAP portal shell.
6. Register the eight initial solutions.
7. Inventory JP private repo assets.
8. Sanitize each project.
9. Move RIA first as the anchor capability.
10. Move Rapid Assessment and ROI Calculator next.
11. Move Client University.
12. Move FlexIOM and industry solutions.
13. Add CODEOWNERS.
14. Add contribution and review process.
15. Conduct security and positioning review.
16. Publish internal release v0.

## Success measures

The migration is successful when:

- UST has a clean repo structure for AI Suite+ for SAP
- The eight initial projects are registered and clearly described
- RIA is preserved as the anchor working solution
- New contributors can understand where to add work
- Client Partners and AMs can understand what each capability is for
- No prohibited private, client, or sensitive content is moved
- The portfolio can grow without becoming chaotic

## Final instruction

When in doubt, optimize for clarity, safety, and maintainability.

UST AI Suite+ for SAP should feel like a well-governed UST SAP capability portfolio, not a collection of disconnected prototypes.

---

## Internal UST Operating Assets

The following internal UST assets should be created, maintained, and reused as part of the UST AI Suite+ for SAP operating model.

### 1. Portfolio Operating Model

Defines how UST AI Suite+ for SAP is governed, organized, maintained, reviewed, and expanded.

Must include:

- Portfolio purpose
- Solution ownership model
- Lane taxonomy
- Intake process
- Review process
- Release process
- Retirement process
- Governance checkpoints
- Repository ownership
- Environment ownership
- Demo readiness ownership

### 2. Reusable Proposal Language Library

A controlled library of reusable UST SAP proposal language.

Must include:

- Approved UST AI Suite+ positioning
- Short and long descriptions for each capability
- Client-safe value propositions
- Problem statements
- Use-case descriptions
- Workshop language
- Demo language
- Next-step language
- Governance and data-safety language

Do not include:

- Customer-confidential language
- Client names unless approved
- Commercials or pricing unless explicitly cleared
- Internal pursuit strategy
- Claims that cannot be supported

### 3. Solution Card Template

Every solution in the portfolio must have a standard solution card.

Minimum fields:

- Solution name
- Short description
- Primary audience lane
- Secondary audience lanes
- Capability type
- Business problem solved
- When to use it
- Key features
- Example client conversation
- Demo status
- Owner
- Route or location
- Data classification
- Governance status
- Notes for sellers
- Notes for delivery teams

### 4. Miniapp Definition Template

Every miniapp or solution app must have a clear definition before it is added to the UST repository.

Minimum fields:

- Miniapp name
- Purpose
- Target user
- Primary job-to-be-done
- Input data
- Output artifact
- Workflow steps
- AI involvement
- Human review requirement
- System integrations
- Security assumptions
- Demo data source
- Known limitations
- Owner
- Build status
- Support model

### 5. Client Data Safety Checklist

Before any project, demo, prompt, file, screenshot, dataset, or workflow is moved into the UST-owned repository, it must pass the client data safety checklist.

Checklist:

- No PII
- No PHI
- No customer confidential information
- No SOX-sensitive evidence
- No security credentials
- No access keys or tokens
- No client-specific process maps unless sanitized and approved
- No screenshots containing client system names, users, IDs, or URLs
- No proprietary customer data
- No pricing, margins, or commercials unless approved
- No production incidents unless anonymized and approved
- No internal pursuit strategy
- No non-UST private IP
- No ClarisTXM private IP

### 6. Demo Script

Each solution must have a reusable demo script.

Minimum sections:

- Demo objective
- Target audience
- Business scenario
- Opening talk track
- User flow
- Key features to show
- Business value to emphasize
- Expected questions
- Suggested responses
- Known limitations
- Closing next step

### 7. GTM Enablement Guide

The GTM enablement guide helps Client Partners, Account Managers, and SAP sales teams understand how to position the portfolio.

Must include:

- Portfolio overview
- Audience lane guide
- Capability catalog
- Use-case mapping
- Discovery questions
- Client conversation starters
- How to select the right solution
- How to avoid overpositioning AI
- How to explain non-AI solutions inside the portfolio
- How to move from interest to workshop, demo, assessment, or proposal
- What not to promise

### 8. Build Backlog

The portfolio must maintain a visible build backlog.

Backlog categories:

- Platform shell
- Landing page
- App registry
- Shared UI components
- Shared chart components
- Solution cards
- Demo data
- RIA migration
- Client University migration
- Rapid Assessment migration
- ROI Calculator migration
- Trade Promotion Optimizer migration
- CX for Life Sciences migration
- CX for Insurance migration
- FlexIOM migration
- Security and governance
- Documentation
- Enablement assets

Backlog item fields:

- Item name
- Description
- Solution area
- Priority
- Owner
- Dependency
- Status
- Acceptance criteria
- Target release

### 9. Offer-to-Delivery Playbook

Defines how a portfolio capability moves from sales conversation into delivery.

Must include:

- Entry points
- Qualification criteria
- Discovery questions
- Recommended first meeting structure
- Demo path
- Workshop path
- Assessment path
- Proposal path
- Delivery handoff
- Roles and responsibilities
- Expected work products
- Governance checkpoints
- Client data handling requirements

### 10. Governance Review Checklist

Every new solution or migrated project must pass a governance review before it is published or presented outside the core team.

Review areas:

- Business fit
- UST ownership
- Client safety
- Data safety
- Security posture
- Demo readiness
- Technical readiness
- Content quality
- Brand alignment
- SAP-safe language
- Legal and compliance considerations
- Support ownership
- Retirement plan

---

## Shared Assets Allowed

The following assets may be shared across all UST AI Suite+ for SAP solutions when they are approved, sanitized, and maintained by the portfolio owner.

### Shared Across All Solutions

- UST AI Suite+ landing page
- UST design system
- UST icons
- Navigation shell
- Solution card template
- App registry
- Demo data standards
- SAP Cloud Foundry deployment patterns
- Authentication pattern
- Logging and audit pattern
- Shared UI components
- Shared chart components
- Shared environment configuration pattern

### Reuse Rules

Shared assets should be used to create a consistent experience across solutions, but solution-specific logic must remain owned by the relevant solution owner.

Reuse is encouraged for:

- Visual design
- Navigation
- Layouts
- Card templates
- Charts
- Common configuration
- Demo-safe sample data patterns
- Logging and audit conventions
- Authentication wrappers
- Environment setup conventions

Reuse requires review for:

- AI prompts
- Scoring logic
- Assessment models
- Data schemas
- Demo datasets
- Client-facing claims
- Industry-specific language
- Solution-specific workflows

---

## Forbidden to Share Casually

Do not mix the following across solutions without explicit governance review and approval.

### Restricted or Prohibited Sharing

- Client data
- Customer-specific demo content
- Commercials
- Internal pursuit strategy
- Private credentials
- Production incident data
- UST confidential delivery details
- ClarisTXM private IP
- Client-specific process maps unless sanitized and approved

### Handling Rules

If any restricted item is discovered during migration:

1. Stop migration for that asset.
2. Mark it as restricted.
3. Remove it from the working branch.
4. Create a sanitized replacement if needed.
5. Request review from the portfolio owner and appropriate UST governance owner.
6. Do not publish, demo, or reuse it until approved.

### Clean Transfer Principle

Only transfer assets that are:

- UST-owned or approved for UST use
- Relevant to UST AI Suite+ for SAP
- Free of client confidential information
- Free of JP private / non-UST IP
- Free of ClarisTXM private IP
- Safe for internal UST repository storage
- Ready to be governed by UST ownership and review

