# Daily Bookkeeping Product Backlog

Updated: 2026-07-07

## Current Priority

The next product priority is trust design, not feature expansion.

Daily Bookkeeping should become a reliable personal ledger:

- Clear amount hierarchy.
- Clear record save state.
- Clear local/cloud state.
- Visible export and recovery path.
- Conservative error and deletion handling.

## P0: Data Reliability Gate

These are not design implementation tasks. They are CTO gates that must be verified before trust-related UI promises are shipped.

1. Verify cloud data owner scoping and account isolation.
2. Verify local save, cloud save, failed cloud save rollback, and reload behavior.
3. Verify export JSON schema, download behavior, and import compatibility.
4. Verify destructive actions download backup before deletion.
5. Verify local/cloud conflict and merge behavior.
6. Verify CloudBase `/apps/ledger/` path and scoped service-worker/cache rules.

No UI should claim sync, backup, restore, or isolation guarantees before the matching item above is verified.

## P1: L2 Trust Design

Implement after P0 verification.

1. Home data status row.
   - Local-only / cloud connected.
   - Last successful sync time when available.
   - Cloud failure state when relevant.
2. Ledger management entry.
   - Export backup.
   - Import/restore.
   - Clear current month with scoped warning.
3. Save feedback.
   - Saved locally.
   - Saved to cloud.
   - Cloud save failed, local copy retained.
4. Empty-state recovery actions.
   - Record first item.
   - Import backup.
5. Visual trust refresh.
   - Ledger-like warm paper and ink base.
   - Blue-slate trust accent.
   - Amber budget attention.
   - Remove dominant green finance-template styling.

## P2: Usability And Review

Implement only after P1 trust design is stable.

1. Category icons using a real icon library.
2. Better all-records mobile view.
3. Lightweight search/filter for records.
4. Monthly insight copy based on real data.
5. Week/year statistics if real usage shows need.

## Explicit Non-Goals For Now

- Bank-card transaction import.
- Investment or net-worth dashboard.
- Family/multi-user shared ledger.
- Heavy analytics.
- Decorative fintech visuals.
- PC-first redesign.

## Portfolio Design Differentiation

- Healthy Pro / Rocky: training cockpit, progress pressure, execution metrics.
- AI4Travel: exploratory trip planning, route/context/adaptation.
- AI4EN: business rehearsal, pitch readiness, high-stakes presentation.
- Daily Bookkeeping: private ledger, calm record keeping, data recovery confidence.

The apps may share engineering practices, but not the same visual personality.
