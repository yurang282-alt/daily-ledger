# Changelog

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
