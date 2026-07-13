# Changelog

## v0.3.3 - 2026-07-13

- Improved mobile accessibility: non-primary text now has stronger contrast, and history export/import controls meet the 44px touch-target baseline.
- Kept the formal Rocky4AI entry and CloudBase release boundary explicit in project documentation.

Verification:

- Local mobile history QA at `390 x 844`: no horizontal overflow or console errors; export/import controls are `44 x 44` and secondary text contrast is `7.01:1` on white.
- Independent design review passed for the actual desktop workspace and mobile-first flows.

## v0.3.2 - 2026-07-13

- Refined the desktop workspace: stable one-line title, balanced monthly overview cards, and readable empty chart state.
- Added a mobile "全部" entry from recent records to a dedicated history and backup screen with export/import controls.
- Versioned updated CSS and JavaScript asset URLs so installed and browser clients receive this release's interface changes.

Verification:

- Browser QA at `1440 x 900` and `390 x 844`: no horizontal overflow, broken images, or console errors.
- Verified desktop entry, analysis, history, export/import visibility; verified mobile home, record, statistics, and history/backup entry flow.

## v0.3.1 - 2026-07-08

- Added a ledger-trust visual refresh: warm paper surface, ink-first hierarchy, slate trust accents, amber budget progress, and non-green app icon/theme colors.
- Migrated the active cloud backend from Supabase to CloudBase `daily-ledger-api`.
- Added CloudBase username/password registration, login, password update, and signed session storage.
- Added CloudBase ledger collections for users, records, categories, and settings with server-side owner scoping.
- Verified CloudBase health, CORS, register, save/read, two-account isolation, static `/apps/ledger/`, and browser page load.
- Scoped service worker cleanup to the current app path so CloudBase `/apps/ledger/` does not affect other apps on the same default domain.
- Changed local-to-cloud wording from sync to merge and added a preflight summary.
- Added JSON backup downloads before importing, clearing a month, or merging local data to cloud.
- Added source status and record summary metadata to exported ledger JSON.

## v0.2.0 - 2026-06-16

Stable username login baseline.

- Replaced email code login with username and password registration/login.
- Kept Supabase Auth and row-level security as the cloud identity boundary.
- Added username mapping so users do not need a real email address or verification code.
- Consolidated auth/session handling and removed duplicate auth helper files.
- Added rollback behavior for failed ledger writes.
- Kept mobile-first ledger, budget, sync, export/import, and voice-entry surfaces usable.

Verification:

- `node --check app.js`
- `git diff --check`
- Confirmed production HTML contains the username auth entry and no old email/code entry.
- Confirmed production `app.js` contains username auth logic and no OTP login logic.

Known limits:

- Supabase project must have Email/Password enabled and Confirm email disabled.
- Domestic access without VPN is not solved yet.
- Real-world usage should be observed for two to three days before adding new features.

## v0.1-stable-login-sync - 2026-06-15

Stable login and sync recovery baseline.

- Restored stable mobile layout and login/sync behavior.
- Preserved local ledger usage with optional cloud sync.
