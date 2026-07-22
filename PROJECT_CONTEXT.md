# Project Context

## One-Liner

每日收支 is a mobile-first personal ledger using Rocky central identity and CloudBase-only personal data.

## User And Problem

- Target user: The user first; potentially personal use across devices later.
- Real problem: Daily income/expense records need to be quick, private, recoverable, and understandable on a phone.
- Current workaround: Manual notes, spreadsheets, or disconnected records without clear sync, backup, and budget state.
- Success signal: The user can quickly record income/expense, view monthly stats and budget reminders, keep records locally, sync privately after login, and export/restore data when needed.

## Product Shape

- Core flow: Sign in once at Rocky account -> open Money without another login -> add/review income and expense records -> export JSON if needed.
- Must-have: Central `money` grant, owner-scoped CloudBase records/categories/settings, rollback on failed cloud save, JSON export, PWA metadata.
- Explicit non-goals: Investment advice, bank-card aggregation, automatic transaction import, multi-user family sharing, complex accounting, or storing privileged CloudBase/API secrets in the client.
- Important states: central session valid, no grant, identity/backend unavailable, failed cloud save rollback, PWA install on mobile.

## Current Status

- Stage: CloudBase-only Rocky unified-login production canary package.
- Working version: `v0.4.0-sso`; central account is the only active identity, and backend failures do not fall back to legacy local/account state.
- Local state: Open `index.html` directly or serve locally at `http://127.0.0.1:4173`.
- GitHub state: `main` is the release branch; use `git log -1 --oneline` for the current immutable commit reference. `codex/username-password-auth` remains historical context only.
- Deployment state: CloudBase `/apps/ledger/` is the primary production path; Vercel remains an optional mirror.
- In-app/release state: `VERSION`, `CHANGELOG.md`, Git tags, and a static app-version meta tag track stable releases.

## Rocky4AI Official Entry And Release Boundary

- Updated: 2026-07-12.
- Rocky4AI formal domain is live with ICP filing, HTTPS certificate, and CloudBase binding.
- Formal root entry: `https://rocky4ai.com/`.
- CloudBase environment ID: `cloud1-d3g79qnvd808824c9`.
- Root `/` is owned only by `app-factory`; the current root entry goes to LifeMap. Daily Bookkeeping and other ordinary apps must never publish to `/`.
- Daily Bookkeeping formal entry: `https://rocky4ai.com/apps/ledger/`.
- Daily Bookkeeping CloudBase path: `/apps/ledger/`.
- CloudBase default domains, test domains, and `localhost` are for development or evidence only; they must not be handed to users as the formal product entry.
- Web internal navigation should prefer same-origin relative paths such as `/apps/<app-name>/`; do not hard-code CloudBase test domains or invent DNS subdomains inside this project.
- The shared Rocky session is the approved identity layer; Money business data stays in Money-owned collections and is not a cross-App database.
- DNS, certificates, domain binding, and root publishing are owned by CTO / `app-factory`; this project must not modify them.
- Every future release must distinguish local files, Git, remote `main`, deployment, and user-visible version, then verify the exact `https://rocky4ai.com/apps/ledger/` entry.

## Architecture

- Client/platform: Static mobile-first web app / PWA.
- Backend/data: CloudBase HTTP API and Money-owned personal collections.
- Auth/identity: Rocky central account plus server-side `money` grant; no Money-specific password or token.
- Storage: `rocky_money_personal_records`, `rocky_money_personal_categories`, and `rocky_money_personal_settings`, all scoped by server-derived `rockyUserId`.
- External services: CloudBase HTTP function/database/static hosting; Vercel static hosting optional as a mirror.
- Key constraints: `config.js` must only contain browser-safe CloudBase API URL, never function secrets or privileged cloud credentials. All finance data reads/writes must go through `daily-ledger-api` and include server-side owner scoping.

## Decisions

- Chosen path: Keep the static web/PWA surface while making CloudBase owner-scoped data the only formal runtime.
- Rejected paths: Do not add bank automation, investments, family sharing, or complex accounting before data correctness, privacy, export, and recovery are strong.
- Why: Personal finance data needs reliability and privacy more than feature breadth. CloudBase removes the VPN dependency while keeping the PWA surface and JSON backup path.
- Revisit trigger: Before exposing to friends, moving to Mini Program, adding recurring records, or changing backend.
- Design priority: Treat "trust design" as a core product requirement, not polish. Daily Bookkeeping should feel like a reliable personal ledger: clear amount hierarchy, visible sync state, visible backup/export/recovery paths, and conservative error recovery. It should not become a flashy fintech dashboard.
- CTO gate: Any UI change that implies cloud save status, backup, restore, export, deletion safety, account isolation, or data recovery must wait for CTO-level validation of data reliability, owner scoping, and export/restore behavior before implementation.

## Risks

- Product risk: If recording is not quick enough or categories feel wrong, the user will stop using it.
- Technical risk: Local and cloud data can diverge if sync, rollback, and migration are not tested carefully.
- Data/privacy risk: Financial records are sensitive; export, backup, row-level security, and key handling must be treated as core product requirements.
- Release risk: Local file, local server, GitHub, CloudBase static hosting, CloudBase HTTP function, Vercel mirror, and installed PWA can each be out of sync.

## Next Actions

- Now: Use the formal `https://rocky4ai.com/apps/ledger/` entry on phone and desktop with a real account, then export a JSON backup after the first real records are confirmed.
- Design backlog: Add L2 trust design work after the data reliability checks are confirmed: data status feedback, export/recovery visibility, save/error feedback, and ledger-like amount hierarchy.
- Later: Run a controlled Supabase-to-CloudBase data migration using JSON export/import only if old Supabase records still matter, then decide whether Supabase can be retired.
- Blocked: Existing Supabase data should not be deleted until the user confirms real CloudBase records and backup/restore are correct.

## Useful Commands Or Links

- Local file: `index.html`
- Local preview URL: `http://127.0.0.1:4173`
- Legacy Supabase schema: `supabase.schema.sql`
- CloudBase API: `cloudfunctions/dailyLedgerApi`
- PWA manifest: `manifest.json`
- Deployment: central formal web route `/apps/ledger/` plus new HTTP function `rockyMoneyPersonalWeb` exposed only through `/daily-ledger-api`; legacy functions and data remain frozen.

## CloudBase Resource Ownership

- Updated: 2026-07-13.
- CloudBase environment: `cloud1-d3g79qnvd808824c9`.
- Canonical static hosting path: `/apps/ledger/`.
- Formal user-facing URL: `https://rocky4ai.com/apps/ledger/`.
- CloudBase development/evidence URL: `https://cloud1-d3g79qnvd808824c9-1444897143.ap-shanghai.app.tcloudbase.com/apps/ledger/`.
- Static-hosting fallback URL: `https://cloud1-d3g79qnvd808824c9-1444897143.tcloudbaseapp.com/apps/ledger/index.html`.
- API URL: `https://cloud1-d3g79qnvd808824c9-1444897143.ap-shanghai.app.tcloudbase.com/daily-ledger-api`.
- Root `/` is reserved for Rocky App 工厂 launcher; do not deploy Daily Bookkeeping to `/`.
- Current source and online CloudBase copy both use scoped service-worker/cache cleanup for the Daily Bookkeeping path.
- Verified 2026-07-13: released `v0.3.3` to static `/apps/ledger/`; the exact formal `https://rocky4ai.com/apps/ledger/` loaded the versioned CSS with no horizontal overflow or console errors. History action targets are `44 x 44`; secondary-text contrast is `7.01:1`. Verified 2026-07-02: API health, CORS preflight, register, save/read, two-account isolation, test-data cleanup, static `/apps/ledger/`, root launcher preservation, and Chrome page load with no console errors.
- Service-worker rule: do not unregister or clear caches for the whole origin when sharing the CloudBase default domain with other apps.
- Source of truth before any CloudBase work: `/Users/bytedance/Documents/Codex/cloudbase-deployment-registry.md`.

## Design Agent Governance

Source of truth: /Users/bytedance/Documents/Codex/app-design-agent-routing-rule.md and /Users/bytedance/Documents/Codex/agent-briefs/design-director-agent.md.

Daily Bookkeeping should use the Product Design Director Agent whenever a new user-facing surface, UI change, prototype, redesign, or friend/team-facing release is discussed.

Design Agent intervention check:

```text
设计 Agent 介入判断：
- 是否有用户界面：
- 是否面向真实用户 / 朋友 / 团队：
- 是否需要和其他 App 形成明显差异：
- 是否有强场景气质：
- 是否会影响核心流程或首次体验：
- 是否已有截图/原型/页面可审：
- 介入级别：L0 / L1 / L2 / L3 / L4
- 本次产出：
```

Intervention levels:

- L0: no design agent for pure backend, scripts, data processing, or tiny non-UI fixes.
- L1: design DNA for a new user-facing app or early product idea.
- L2: design audit for an existing UI, screenshot, URL, or runnable demo.
- L3: redesign direction for core pages, onboarding, navigation, or first-use experience.
- L4: portfolio design system when multiple apps need shared components but distinct visual identities.


This project's design DNA:

- Product identity: Personal ledger for fast income/expense recording.
- Desired feeling: Reliable, quiet, low-friction, financially clear.
- Design direction: Trust-first ledger structure, strong amount hierarchy, compact mobile entry, visible data state, sober non-fintech colors.
- Avoid: Flashy fintech dashboard, decorative charts before data is reliable.
- First design focus: Make record, review, export, and recovery feel trustworthy.
- Portfolio contrast: Unlike Healthy Pro / Rocky, this is not a training cockpit with performance pressure. Unlike AI4Travel, this is not exploratory or optimistic. Unlike AI4EN, this is not a high-stakes rehearsal surface. Daily Bookkeeping should be calmer, more private, and more ledger-like than all three.

Boundaries:

- The design agent defines design DNA, audits UI/UX fit, and produces design recommendations.
- The main product partner + CTO agent still decides priority, product scope, architecture, release, and whether implementation should start.
- The design agent does not publish, merge, deploy, change databases, or change permissions by default.

## Rocky SSO batch status — 2026-07-22

- `/apps/ledger/` uses central `appId=money`; old username/password routes and legacy browser token cannot authorize the central mode.
- The backend derives `ownerId` only from the central `rockyUserId`; the browser cannot submit or select another owner.
- New records use `rocky_money_personal_*` collections and are namespaced by central owner. Existing unscoped local data and legacy backend records remain frozen, with no automatic merge or fallback.
- Foreign-origin mutations fail closed; Service Worker cleanup is exact-path only.
- A/B synthetic owner isolation and failure tests pass. Production truth is recorded by the central Rocky release evidence.
