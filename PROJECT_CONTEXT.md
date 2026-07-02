# Project Context

## One-Liner

每日收支 is a mobile-first lightweight bookkeeping web app for personal income and expense tracking, supporting local ledger use and optional CloudBase cloud sync.

## User And Problem

- Target user: The user first; potentially personal use across devices later.
- Real problem: Daily income/expense records need to be quick, private, recoverable, and understandable on a phone.
- Current workaround: Manual notes, spreadsheets, or disconnected records without clear sync, backup, and budget state.
- Success signal: The user can quickly record income/expense, view monthly stats and budget reminders, keep records locally, sync privately after login, and export/restore data when needed.

## Product Shape

- Core flow: Open app -> add income/expense record -> choose category/date/note -> review monthly totals and budget -> optionally log in -> sync local ledger to cloud -> export JSON if needed.
- Must-have: Local ledger, income/expense records, categories, monthly budget/settings, CloudBase username/password auth, cloud sync, rollback on failed cloud save, JSON export with schema version, PWA install metadata.
- Explicit non-goals: Investment advice, bank-card aggregation, automatic transaction import, multi-user family sharing, complex accounting, or storing privileged CloudBase/API secrets in the client.
- Important states: Local-only use, logged-in cloud sync, existing local ledger prompt before sync, failed cloud save rollback, PWA install on mobile.

## Current Status

- Stage: Usable static mobile web/PWA with local ledger and verified CloudBase API sync.
- Working version: `v0.3.0` uses CloudBase `daily-ledger-api` for active cloud auth/data, while keeping local ledger, username/password login, password change, local-to-cloud merge prompt, rollback on failed cloud write, JSON export schema version, and PWA installation.
- Local state: Open `index.html` directly or serve locally at `http://127.0.0.1:4173`.
- GitHub state: `main` and `codex/username-password-auth` pointed to `14acc2d Replace email OTP with username password auth` before version-management changes.
- Deployment state: CloudBase `/apps/ledger/` is the primary production path; Vercel remains an optional mirror.
- In-app/release state: `VERSION`, `CHANGELOG.md`, Git tags, and a static app-version meta tag track stable releases.

## Architecture

- Client/platform: Static mobile-first web app / PWA.
- Backend/data: Local browser ledger plus optional CloudBase HTTP API persistence.
- Auth/identity: CloudBase `daily-ledger-api` username/password auth; the API stores salted password hashes and signs long-lived session tokens; no real user email or verification code required.
- Storage: Local ledger data object includes records, categories, and budget/settings. CloudBase collections are `daily_ledger_users`, `daily_ledger_records`, `daily_ledger_categories`, and `daily_ledger_settings`.
- External services: CloudBase HTTP function/database/static hosting; Vercel static hosting optional as a mirror.
- Key constraints: `config.js` must only contain browser-safe CloudBase API URL, never function secrets or privileged cloud credentials. All finance data reads/writes must go through `daily-ledger-api` and include server-side owner scoping.

## Decisions

- Chosen path: Keep a static web/PWA app with local-first data and optional CloudBase sync.
- Rejected paths: Do not add bank automation, investments, family sharing, or complex accounting before data correctness, privacy, export, and recovery are strong.
- Why: Personal finance data needs reliability and privacy more than feature breadth. CloudBase removes the VPN dependency while keeping the PWA surface and JSON backup path.
- Revisit trigger: Before exposing to friends, moving to Mini Program, adding recurring records, or changing backend.

## Risks

- Product risk: If recording is not quick enough or categories feel wrong, the user will stop using it.
- Technical risk: Local and cloud data can diverge if sync, rollback, and migration are not tested carefully.
- Data/privacy risk: Financial records are sensitive; export, backup, row-level security, and key handling must be treated as core product requirements.
- Release risk: Local file, local server, GitHub, CloudBase static hosting, CloudBase HTTP function, Vercel mirror, and installed PWA can each be out of sync.

## Next Actions

- Now: Use the CloudBase URL on phone and desktop with a real account, then export a JSON backup after the first real records are confirmed.
- Later: Run a controlled Supabase-to-CloudBase data migration using JSON export/import only if old Supabase records still matter, then decide whether Supabase can be retired.
- Blocked: Existing Supabase data should not be deleted until the user confirms real CloudBase records and backup/restore are correct.

## Useful Commands Or Links

- Local file: `index.html`
- Local preview URL: `http://127.0.0.1:4173`
- Legacy Supabase schema: `supabase.schema.sql`
- CloudBase API: `cloudfunctions/dailyLedgerApi`
- PWA manifest: `manifest.json`
- Deployment: CloudBase static hosting `/apps/ledger/` plus HTTP function `daily-ledger-api`; Vercel is optional mirror only.

## CloudBase Resource Ownership

- Updated: 2026-07-02.
- CloudBase environment: `cloud1-d3g79qnvd808824c9`.
- Canonical static hosting path: `/apps/ledger/`.
- User-facing URL: `https://cloud1-d3g79qnvd808824c9-1444897143.tcloudbaseapp.com/apps/ledger/index.html`.
- API URL: `https://cloud1-d3g79qnvd808824c9-1444897143.ap-shanghai.app.tcloudbase.com/daily-ledger-api`.
- Root `/` is reserved for Rocky App 工厂 launcher; do not deploy Daily Bookkeeping to `/`.
- Current source and online CloudBase copy both use scoped service-worker/cache cleanup for the Daily Bookkeeping path.
- Verified 2026-07-02: API health, CORS preflight, register, save/read, two-account isolation, test-data cleanup, static `/apps/ledger/`, root launcher preservation, and Chrome page load with no console errors.
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
- Design direction: Ledger-like structure, strong amount hierarchy, compact mobile entry, sober colors.
- Avoid: Flashy fintech dashboard, decorative charts before data is reliable.
- First design focus: Make record, review, export, and recovery feel trustworthy.

Boundaries:

- The design agent defines design DNA, audits UI/UX fit, and produces design recommendations.
- The main product partner + CTO agent still decides priority, product scope, architecture, release, and whether implementation should start.
- The design agent does not publish, merge, deploy, change databases, or change permissions by default.
