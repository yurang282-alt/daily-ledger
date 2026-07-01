# Project Context

## One-Liner

每日收支 is a mobile-first lightweight bookkeeping web app for personal income and expense tracking, supporting local ledger use and optional Supabase cloud sync.

## User And Problem

- Target user: The user first; potentially personal use across devices later.
- Real problem: Daily income/expense records need to be quick, private, recoverable, and understandable on a phone.
- Current workaround: Manual notes, spreadsheets, or disconnected records without clear sync, backup, and budget state.
- Success signal: The user can quickly record income/expense, view monthly stats and budget reminders, keep records locally, sync privately after login, and export/restore data when needed.

## Product Shape

- Core flow: Open app -> add income/expense record -> choose category/date/note -> review monthly totals and budget -> optionally log in -> sync local ledger to cloud -> export JSON if needed.
- Must-have: Local ledger, income/expense records, categories, monthly budget/settings, Supabase username/password auth, cloud sync, rollback on failed cloud save, JSON export with schema version, PWA install metadata.
- Explicit non-goals: Investment advice, bank-card aggregation, automatic transaction import, multi-user family sharing, complex accounting, or storing privileged Supabase keys in the client.
- Important states: Local-only use, logged-in cloud sync, existing local ledger prompt before sync, failed cloud save rollback, PWA install on mobile.

## Current Status

- Stage: Usable static mobile web/PWA with local ledger and Supabase Auth/sync.
- Working version: `v0.2.0` documents local use, Supabase setup, username/password login, password change, local-to-cloud sync prompt, rollback on failed cloud write, JSON export schema version, and PWA installation.
- Local state: Open `index.html` directly or serve locally at `http://127.0.0.1:4173`.
- GitHub state: `main` and `codex/username-password-auth` pointed to `14acc2d Replace email OTP with username password auth` before version-management changes.
- Deployment state: Production URL `https://daily-ledger-ten-inky.vercel.app/` was verified after username auth deployment.
- In-app/release state: `VERSION`, `CHANGELOG.md`, Git tags, and a static app-version meta tag track stable releases.

## Architecture

- Client/platform: Static mobile-first web app / PWA.
- Backend/data: Local browser ledger plus optional Supabase cloud persistence.
- Auth/identity: Supabase Auth with username/password UX mapped to a Supabase-compatible internal login identity; no real user email or verification code required.
- Storage: Local ledger data object includes records, categories, and budget/settings. Cloud tables are `ledger_records`, `ledger_categories`, and `ledger_settings`.
- External services: Supabase Auth/Postgres; Vercel static hosting optional.
- Key constraints: `config.js` must only contain browser-safe Supabase publishable key, never secret/service-role keys. Row-level security is enabled in `supabase.schema.sql`.

## Decisions

- Chosen path: Keep a static web/PWA app with local-first data and optional Supabase sync.
- Rejected paths: Do not add bank automation, investments, family sharing, or complex accounting before data correctness, privacy, export, and recovery are strong.
- Why: Personal finance data needs reliability and privacy more than feature breadth. Static/PWA plus Supabase is enough if sync and rollback stay trustworthy.
- Revisit trigger: Before exposing to friends, moving to Mini Program, adding recurring records, or changing backend.

## Risks

- Product risk: If recording is not quick enough or categories feel wrong, the user will stop using it.
- Technical risk: Local and cloud data can diverge if sync, rollback, and migration are not tested carefully.
- Data/privacy risk: Financial records are sensitive; export, backup, row-level security, and key handling must be treated as core product requirements.
- Release risk: Local file, local server, GitHub, Vercel deployment, Supabase Auth redirect config, and installed PWA can each be out of sync.

## Next Actions

- Now: Tag the current stable username-login baseline and use it for rollback before adding new bookkeeping features.
- Later: Confirm export/restore, backup path, schema migration plan, and whether the app should stay PWA or move to Mini Program.
- Blocked: Current deployed URL and Supabase project configuration need verification before any friend-facing or cross-device recommendation.

## Useful Commands Or Links

- Local file: `index.html`
- Local preview URL: `http://127.0.0.1:4173`
- Supabase schema: `supabase.schema.sql`
- PWA manifest: `manifest.json`
- Deployment: Vercel static project, build/output empty

## CloudBase Resource Ownership

- Updated: 2026-06-30.
- CloudBase environment: `cloud1-d3g79qnvd808824c9`.
- Canonical static hosting path: `/apps/ledger/`.
- User-facing URL: `https://cloud1-d3g79qnvd808824c9-1444897143.tcloudbaseapp.com/apps/ledger/index.html`.
- Root `/` is reserved for Rocky App 工厂 launcher; do not deploy Daily Bookkeeping to `/`.
- Current online staging copy has scoped service-worker cleanup, but the source project should be patched before the next CloudBase deploy.
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

