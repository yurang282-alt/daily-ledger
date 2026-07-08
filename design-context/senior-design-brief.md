# Daily Bookkeeping Senior Design Brief

Date: 2026-07-07

## Product Position

Daily Bookkeeping is a private personal ledger for fast daily expense recording and later monthly review. Its design must optimize trust, speed, and recoverability before visual novelty.

It should feel like a reliable ledger, not a flashy fintech dashboard.

## First-Principles Product Need

The user is not trying to "use a finance app." The user is trying to make sure small daily expenses become durable records that can be checked, synced, exported, and recovered.

The core design question is:

> Did my record get written correctly, and can I get it back if something goes wrong?

Every design decision should answer that question before adding decoration or analysis.

## Core Recording Path

Primary path:

1. Open app.
2. See current month spending and ledger state.
3. Tap record.
4. Enter amount.
5. Choose category/date.
6. Save.
7. Receive clear write-state feedback.
8. Return to home or recent records with the new item visible.

Design requirements:

- The record action must stay reachable from the bottom center on mobile.
- The amount input must be the visual center of the record page.
- Category and date selection must be secondary but visible.
- Voice input is a speed layer, not a replacement for confirmation.
- After save, the user must know whether the record is saved locally, synced to cloud, or queued/failed.

## Amount Hierarchy

Amount hierarchy is the product's visual backbone.

Home:

- Primary: current month spent.
- Secondary: budget state and percentage.
- Tertiary: recent records and trend hints.

Record:

- Primary: amount being written.
- Secondary: category/date.
- Tertiary: note and optional voice details.

Statistics:

- Primary: period total and category distribution.
- Secondary: daily average, largest category, trend.
- Tertiary: insight copy.

Do not let decorative cards, oversized charts, or colorful states compete with the amount.

## Data State Feedback

Data state must be visible without making the app noisy.

Required states:

- Local-only.
- Cloud connected.
- Last successful sync time.
- Save in progress.
- Save succeeded locally.
- Save succeeded in cloud.
- Cloud save failed but local copy retained.
- Merge required.
- Export/backup available.
- Restore/import available.

Suggested UI pattern:

- A compact data status row on home.
- A save result toast or inline confirmation after record save.
- A ledger management entry for export/import/recovery.

Do not overpromise "safe" unless the underlying data path has been verified.

## Export / Recovery Entry

Export and recovery are not advanced settings for a finance app. They are core trust features.

Minimum design:

- Home or ledger detail should expose "导出备份" within two taps.
- Empty state should offer "导入备份" when there are no records.
- Dangerous actions must show scope and backup behavior before confirmation.
- Imported data should show a short summary before final merge when the implementation supports it.

Design copy should use plain language:

- "导出当前账本备份"
- "从备份恢复"
- "清空本月前会先下载备份"
- "只影响当前月份"

## Error / Undo / Recovery

Required design behavior:

- Failed cloud save should not look successful.
- If local rollback exists, the UI should say what happened.
- If a destructive action succeeds, provide a clear post-action state.
- If undo is not technically available, do not imply undo.
- If backup was downloaded first, say so in the confirmation or completion message.

Financial records are high-trust data. Ambiguous success messages are worse than visible failure.

## Visual Direction

Preferred direction:

- Warm paper base.
- Ink-first typography.
- Muted blue-slate for trust/status.
- Amber for budget threshold and caution.
- Red only for destructive actions.

Avoid:

- Green as the dominant product color.
- Flashy gradients.
- Decorative fintech charts.
- Portfolio-wide generic white-card dashboards.

See also:

- `design-context/visual-direction.md`
- `design-output/design-audit.md`

## Difference From Other Apps

### Healthy Pro / Rocky

Healthy Pro should feel like a serious training cockpit: metrics, progress, execution, physical discipline.

Daily Bookkeeping should not borrow that pressure. It should feel quieter and more private. Its rhythm is record -> review -> reconcile -> export, not plan -> execute -> record -> adjust.

### AI4Travel

AI4Travel should feel exploratory and adaptive: route, weather, places, options.

Daily Bookkeeping should not feel exploratory. It should reduce ambiguity, not invite browsing. Its confidence comes from stable records and recovery paths.

### AI4EN

AI4EN should feel like business rehearsal under time pressure: presentation-ready, sharp, slightly high-stakes.

Daily Bookkeeping should not feel performative. It should feel calm and durable, with less urgency and stronger private-data reassurance.

## Items That Must Wait For CTO Validation

These design ideas should not be implemented until CTO confirms the underlying data behavior:

1. "Cloud synced" or "last synced" UI.
   - Requires verified save/read path, timestamp semantics, offline behavior, and failure handling.
2. "Backup completed" or "auto backup" UI.
   - Requires verified export generation, file delivery, schema version, and restore compatibility.
3. Restore/import preview and merge UI.
   - Requires validated merge rules, duplicate handling, rollback behavior, and corrupt-file handling.
4. Clear-month safety copy that promises backup first.
   - Requires verified backup-before-delete execution and failure-stop behavior.
5. Account isolation confidence copy.
   - Requires verified owner scoping, permission boundaries, and cross-account data isolation.
6. Offline queue or retry UI.
   - Requires explicit conflict strategy and local/cloud reconciliation policy.

Until these are verified, design copy should say only what the system can prove.

## Minimum Implementation Recommendation

After CTO validation, implement the smallest trust-design layer:

1. Home data status row.
2. Mobile-visible ledger management entry.
3. Save result feedback.
4. Export/import entry in empty and ledger-detail states.
5. Non-green ledger visual refresh.

Do not add complex analytics before trust design is complete.
