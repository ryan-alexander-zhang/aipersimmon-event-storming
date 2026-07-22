---
id: record-00010-narrative-walkthrough-acceptance
type: record
role: main
status: active
parent: plan-00010-narrative-walkthrough
---

# Acceptance record: narrative walkthrough

Acceptance evidence for [plan-00010](../plan/plan-00010-narrative-walkthrough.md),
implementing [us-00014](../us/us-00014-narrative-walkthrough.md) per
[spec-00005](../spec/spec-00005-narrative-walkthrough.md). Verified 2026-07-22.
An independent subagent cross-checked every us-00014 GWT and spec-00005-XAC
against the tests: verdict **PASS** on coverage (the only first-pass blocker was
this record not yet existing). No test gaps.

## Gate results

- Unit: **168 passed** (`bun run test`); `lib/**` coverage **97.9% stmts /
  89.44% branch / 98.56% funcs / 99.56% lines** (≥90% lines/funcs bar met);
  `timeline.ts` and `store.ts` at 100% lines.
- E2E: **31 passed** (`bun run test:e2e`, Playwright/chromium).
- `bunx tsc --noEmit`, `bun run lint`, `bun run build` all clean.

## GWT / XAC coverage

| Id | Test(s) | Result |
| --- | --- | --- |
| us-00014-AC-1.1 (start selects + highlights first) | unit store.test.ts "walkthrough steps the timeline read-only…" (`index 0`, first selected); e2e "narrative walkthrough…" (`1 / 2`, "Order Placed") | pass |
| us-00014-AC-2.1 (step forward/back) | unit store.test.ts (`walkStep` ±1); timeline.test.ts "timelineOrder sorts…"; e2e (Next/Previous → labels) | pass |
| us-00014-AC-3.1 (clamp at ends) | unit store.test.ts (index stays at bounds); e2e (Next disabled at last) | pass |
| us-00014-AC-4.1 (arrow does not reorder) | e2e (on last event, `ArrowLeft` → label stays "Payment Taken"; would flip if un-suppressed) | pass |
| us-00014-AC-5.1 (exit leaves model unchanged) | unit store.test.ts (`JSON.stringify(nodes)` snapshot equality after `stopWalkthrough`); e2e (overlay removed) | pass |
| spec-00005-XAC-1.1 (arrow key → order unchanged) | e2e (same read-only assertion; suppressed by `if (s.walk.active) return;` in editor.tsx) | pass |

Also covered: empty-board start (no selection, no-op step) and `walk` reset on
`clear` (unit store.test.ts), matching plan P1.2's verify and spec §5.

## FR realization

FR-1 (`startWalkthrough` selects first + existing selection-focus dims the rest),
FR-2 (`walkStep` ±1 selects), FR-3 (clamp, no wrap), FR-4 (read-only: arrow-nudge
suppressed while `walk.active`; steps never write the model), FR-5
(`stopWalkthrough` leaves model unchanged). All realized.

## Deliverables

- `lib/store/timeline.ts`: pure `timelineOrder(nodes)` (+tests).
- `lib/store/store.ts`: view-only `walk` state + `startWalkthrough`/`walkStep`/
  `stopWalkthrough`; reset on `clear`/`setModel` (+tests).
- `components/walkthrough.tsx`: overlay (Prev/Next/Exit, `n / N`, current label,
  `fitView` on the current event); `toolbar.tsx` Walk toggle; `editor.tsx`
  arrow-nudge suppression.
- CONTEXT.md: Walkthrough term.

## Design notes (from spec-00005 §1, realised)

One Domain Event per step in `(order, context, id)` sequence; highlight reuses
the existing selection-focus (dim), not hide/isolate; navigation via on-screen
controls (not arrow keys, which stay bound to timeline nudge and are suppressed
during a walkthrough). Read-only throughout.
