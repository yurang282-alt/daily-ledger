# Changelog

## Unreleased

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
