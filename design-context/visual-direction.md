# Daily Bookkeeping Visual Direction

Date: 2026-07-07

## One-Line Direction

Daily Bookkeeping should move away from the current green finance-template look and become a quiet personal ledger: warm paper base, ink-first typography, restrained blue-slate trust accents, and amber only for budget attention.

## Current Evidence

Current screenshots:

- `design-output/visual-refresh-20260707/01-current-home.png`
- `design-output/visual-refresh-20260707/02-current-record.png`
- `design-output/visual-refresh-20260707/03-current-stats.png`

Current CSS evidence:

- `styles.css` uses green as the dominant product token: `--green`, `--green-deep`, `--green-soft`.
- Mobile home card, save button, active category, center add button, active tab, and statistics segment all reuse green.
- Result: the UI reads as a generic green finance template instead of a personal, durable ledger.

## Why Green Should Be Replaced

Green usually signals investment, growth, profit, or fintech confidence. This app's core job is different: fast personal expense recording, later review, and confidence that the data will not disappear.

The app should not feel like a bank dashboard. It should feel like a calm personal book with clear saved state.

## Recommended Palette

Use a non-green primary system.

### Primary

- Ink: `#202124`
- Paper background: `#F7F3EA`
- Raised surface: `#FFFDF8`
- Border: `#E4DDD0`
- Muted text: `#6F6A60`

### Trust Accent

- Slate blue: `#3E5C76`
- Slate blue soft: `#E7EEF4`
- Deep navy for primary actions: `#263A4D`

### Budget / Warning

- Amber: `#C47A2C`
- Amber soft: `#FFF1D8`

### Destructive

- Red: `#B94A48`
- Red soft: `#F7E4E1`

Avoid using green as the main product color. If green remains at all, reserve it for a rare positive state, not brand, navigation, cards, or primary buttons.

## Page Direction

### Home

Goal: answer "How much did I spend this month, and is my ledger safe?"

Changes:

- Replace the green gradient spending card with a paper/ink ledger card.
- Use a small slate-blue sync chip for cloud/local status.
- Keep monthly spending as the strongest element.
- Budget progress should be amber, not green.
- Add a visible data safety row:
  - Cloud/local status
  - Last sync time
  - Export backup entry

The home screen should feel like an overview page, not a promotional finance card.

### Record

Goal: make recording feel fast but also final.

Changes:

- Keep the big amount input.
- Reduce heavy card borders; use paper-like sections and thin dividers.
- Category buttons should be quiet chips, not green tiles.
- Active category can use slate outline and light fill.
- Primary save button should be deep navy/slate, not green.
- Voice input should become a stronger secondary action:
  - Mic icon
  - "语音输入"
  - Parsed preview after recognition

The record page should feel like writing one line into a ledger, not filling a generic form.

### Statistics

Goal: summarize spending without pretending there is deep analysis when data is empty.

Changes:

- Replace green active segment with slate.
- Empty donut should be lighter and smaller; empty state should point to "记一笔" or "导入备份".
- When records exist, category chart should use multiple muted colors:
  - Slate blue
  - Amber
  - Muted clay
  - Soft gray
  - Dusty teal only as one data color, not the brand color

The statistics page should feel analytical but restrained.

## Component Direction

- Cards: reduce shadows; use border plus very soft shadow.
- Radius: keep 8-12px for cards and controls; avoid overly pill-shaped everything.
- Bottom center add button: can stay circular, but should be slate/navy instead of green.
- Text hierarchy:
  - Big monthly amount
  - Then budget/sync state
  - Then recent records
  - Then secondary actions
- Icons: use consistent real icons later; do not use decorative assets.

## What To Keep

- Three-screen structure: 首页 / 记录 / 统计.
- Bottom center record action.
- Big amount input on record page.
- Month switcher.
- Mobile-first scope.
- Quiet, low-density empty states.

## What Not To Do

- Do not switch to bright blue fintech style.
- Do not use purple gradients or decorative backgrounds.
- Do not add complex charts before real data exists.
- Do not make PC the priority.
- Do not redesign data model, auth, CloudBase, export, or restore logic as part of the visual pass.

## Minimum Implementation Scope

If this direction is implemented, keep it to one visual pass:

1. Replace color tokens and mobile green overrides.
2. Restyle home spending card from green gradient to ledger card.
3. Restyle primary actions, active tabs, active category, and center add button to slate/navy.
4. Restyle budget progress to amber.
5. Add or expose the data safety row only if the current UI already has the needed state; otherwise leave it for a separate product change.

Acceptance:

- No dominant green remains in home, record, or statistics.
- The app still feels calm and trustworthy.
- Screens remain usable at 390 x 844.
- Bottom navigation and record flow still work.
- Export/import/recovery logic is not touched.
