---
id: record-00017-compare-diff-detail-acceptance
type: record
role: main
status: active
parent: plan-00017-compare-diff-detail
---

# Acceptance record: field-level change detail in the compare diff

Acceptance evidence for [plan-00017](../plan/plan-00017-compare-diff-detail.md),
implementing the us-00023 FR-8/FR-9 extension per
[design-00010](../design/design-00010-compare-diff-detail.md); scope fixed by
[decision-00010](../decision/decision-00010-diff-field-level-detail.md) (patch of
decision-00009). Deepens the unified diff (plan-00016) so a changed element shows
*what* changed. Verified 2026-07-23. An independent subagent cross-checked the new
GWTs (AC-8.1, 8.2, 9.1); verdict **PASS**, no gaps.

## Gate results

- Unit: **245 passed** (`bun run test`); `lib/**` coverage ≥90% (`diff.ts` 100%
  lines/funcs; `diff-display.ts` 100% lines/funcs; all-files 99.5% lines / 99% funcs).
- E2E: **45 passed** (`bun run test:e2e`, chromium).
- `bunx tsc --noEmit`, `bun run lint`, `bun run build` all clean.

## GWT coverage (new)

| Id | Test(s) | Result |
| --- | --- | --- |
| us-00023-AC-8.1 (renamed → previous label struck-through) | diff-display.test.ts "renders a rename as a struck old label"; e2e asserts `diff-renamed-from` = "测试3" | pass (unit + e2e) |
| us-00023-AC-8.2 (order → direction chip, not a slot number) | diff-display.test.ts "direction chip, not a number" (asserts `⬅/➡` + no digit); e2e `diff-chips` contains "later", no digit | pass (unit + e2e) |
| us-00023-AC-9.1 (hover → field detail with resolved context names) | diff-display.test.ts "resolves context ids to names" (`context: Ordering → Payment`); e2e reads the `[title]` and asserts `label: 测试3 → 测试3改` | pass (unit: names; e2e: hover mechanism) |

Note (subagent): the e2e scenario renames + reorders but does not reassign context, so
context-name resolution (AC-9.1's load-bearing claim) is covered by the unit test; the
e2e proves the hover-reveal mechanism. Combined coverage is genuine.

## Deliverables

- **Engine**: `lib/dsl/diff.ts` — `ModelDiff.changed: Map<id, {before, after, fields}>`
  with `FieldChange` over `label/order/context/pivotal/state/kind/priority/description`.
- **Display**: `lib/dsl/diff-display.ts` — pure `describeChange(changed, baseContexts,
  targetContexts)` → `{ renamedFrom, chips, detail }`; order → direction chip, context
  ids → names, chips capped at 3 with `+N`.
- **UI**: `compare-diff-view.tsx` builds the display map and passes it to
  `snapshot-board.tsx` (attaches `data.diffChange`); `snapshot-node.tsx` renders the
  struck previous label, chip row, and the full detail as the node `title` (hover).

## Deferred (recorded, not gaps)

Per decision-00010 / spec-00008 §6: no spatial "ghost + arrow" for moved elements
(order conveyed by the direction chip + the element's new column); the hover detail is
the native `title` in v1 (a styled popover is a later polish); no field-level diff for
edges / contexts / context relationships beyond added/removed/changed.
