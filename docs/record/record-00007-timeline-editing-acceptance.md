---
id: record-00007-timeline-editing-acceptance
type: record
role: main
status: active
parent: plan-00007-timeline-editing
---

# Acceptance record: timeline editing by direct manipulation

Acceptance evidence for [plan-00007](../plan/plan-00007-timeline-editing.md),
implementing [us-00010](../us/us-00010-adjust-timeline.md) per
[design-00004](../design/design-00004-timeline-editing.md). Verified 2026-07-21.
An independent subagent cross-checked every us-00010 GWT (and the touched
us-00007-AC-4.1) against the tests; verdict **PASS**, no coverage gaps, all eight
FRs realized.

## Gate results

- Unit: **134 passed** (`bun run test`); `lib/**` coverage **97.79% stmts /
  87.95% branch / 98.26% funcs / 99.44% lines** (≥90% lines bar met);
  `timeline.ts` 100% lines, `store.ts` 100% lines.
- E2E: **26 passed** (`bun run test:e2e`, Playwright/chromium).
- `bunx tsc --noEmit`, `bun run lint`, `bun run build` all clean.
- Real-browser verification (agent-browser, CDP drag): drag-to-reorder,
  concurrency merge, the drop indicator, out-of-context cancel, and the keyboard
  move all confirmed on the live app.

## GWT coverage

| GWT id | Test(s) | Result |
| --- | --- | --- |
| us-00010-AC-1.1 (drag into gap → A,C,B) | unit store.test.ts `[us-00010-AC-1.1]` | pass |
| us-00010-AC-1.2 (drop after last → B,C,A) | unit store.test.ts `[us-00010-AC-1.2]` | pass |
| us-00010-AC-2.1 (drop onto → concurrent) | unit store.test.ts `[us-00010-AC-2.1]` (equal order, same x, different y); real-browser | pass |
| us-00010-AC-3.1 (split concurrent out) | unit store.test.ts `[us-00010-AC-3.1]` | pass |
| us-00010-AC-4.1 (move to start → C,A,B) | unit store.test.ts `[us-00010-AC-4.1]`; e2e editor.spec.ts (panel button) | pass |
| us-00010-AC-5.1 (arrow-left → B,A,C) | unit store.test.ts `[us-00010-AC-5.1]`; e2e editor.spec.ts (ArrowLeft); real-browser | pass |
| us-00010-AC-6.1 (gap→line vs onto→highlight) | unit timeline.test.ts `dropTarget [us-00010-AC-6.1]` + `dropOrder`; renders via `TimelineDropIndicator`; real-browser | pass |
| us-00010-AC-7.1 (cancel / out-of-context) | unit timeline.test.ts `dropOrder … cancels [us-00010-AC-7.1]`; Escape via `cancelRef`; real-browser | pass |
| us-00010-AC-8.1 (no empty column) | unit store.test.ts `[us-00010-AC-8.1]`; `normalizeContextOrders` timeline.test.ts | pass |
| us-00007-AC-4.1 (only timeline elements draggable) | e2e editor.spec.ts `[us-00007-AC-4.1]`; `draggable: n.type === "domainEvent"` | pass |

## FR realization

FR-1→AC-1.1/1.2 · FR-2→AC-2.1 · FR-3→AC-3.1 · FR-4→AC-4.1 (`moveEventToEnd`) ·
FR-5→AC-5.1 (`nudgeEvent`) · FR-6→AC-6.1 (`dropTarget`) · FR-7→AC-7.1 (`dropOrder`
null + Escape) · FR-8→AC-8.1 (`normalizeContextOrders`). All eight realized.

## Known limitation (scoped, not a gap)

React Flow v12's pointer-drag (d3-drag) cannot be driven by Playwright's
synthetic mouse/pointer events (`onNodeDragStart` never fires), so the pointer
gesture itself is not asserted in the Playwright e2e. Each drag-only AC is
instead covered by a store/unit test of the exact commit path the drag uses
(`setEventOrder`, `dropTarget`, `dropOrder`) plus real-browser verification via
agent-browser's CDP drag (design-00004 §9). No AC rests on the un-simulable
gesture alone.

No test references a removed GWT id. plan-00007 is `resolved`.
