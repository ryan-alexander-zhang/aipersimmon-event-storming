---
id: record-00003-readability-tier-a-acceptance
type: record
role: main
status: active
parent: plan-00003-readability-tier-a
---

# Acceptance record: board readability Tier A (plan-00003)

Acceptance evidence for [plan-00003-readability-tier-a](../plan/plan-00003-readability-tier-a.md),
implementing [design-00003](../design/design-00003-board-readability-at-scale.md) Tier A.
Verified 2026-07-20. An independent subagent re-ran the gates and mapped every
acceptance-path item to concrete evidence; it found no gaps.

This plan is **view-only** (no DSL/layout change, no new `us`/`spec` GWT), so
acceptance is behavioural + quality gates rather than a GWT-to-test map.

## Gate results

- Unit: **85 passed** (`bun run test`). Coverage on `lib/**`: **90.84% branch /
  100% line / 98.87% func / 99.65% stmt** (≥90% bar met).
- E2E: **16 passed** (Playwright/chromium, run against the dev server).
- `tsc --noEmit`, `bun run lint`, `bun run build` clean.

## Task coverage

| Task | Delivered | Evidence |
| --- | --- | --- |
| RA1 relation style map (two tiers) | yes | `lib/eventstorming/edge-style.ts`; `edge-style.test.ts` (all types styled; tiers partition) |
| RA2 focus-set helper (pure) | yes | `lib/store/focus.ts` `computeFocus`; `focus.test.ts` (node + neighbours + incident edges; empty→empty) |
| RA3 hover view state + precedence | yes | `focus.ts` `focusSource` (hover > selection); `store.ts` `hoveredId`/`setHovered` cleared on clear/setModel; `focus.test.ts` + `store.test.ts` |
| RA4 custom edge + on-demand labels | yes | `components/edges/relation-edge.tsx` (colour/weight, dim off-focus, label only on-focus); wired in `editor.tsx` |
| RA5 node dimming + hover wiring | yes | `editor.tsx` decoratedNodes → 0.15 opacity off-focus; `onNodeMouseEnter/Leave`; pane click restores |
| RA6 parallel-edge separation | yes | `lib/layout/edge-spread.ts` `computeEdgeCurvature`; `edge-spread.test.ts` (fan-out, convergence, unrelated untouched) |
| RA7 integration + regression + E2E | yes | focus memoised in `editor.tsx`; `e2e/editor.spec.ts` focus/label tests; existing suites green |

## Success criterion (design-00003 §4)

| Behaviour | Test | Result |
| --- | --- | --- |
| Labels hidden by default, shown for the focused node's incident edges only | E2E `relation labels appear only for the focused node` | pass |
| Focused node stays opaque while unrelated nodes/edges recede | E2E `focusing a node dims the rest of the board` | pass |

Visually confirmed on the 56-node ride-hailing model: focusing `Trip Ended`
leaves its `emits`/`triggers` chain readable while the rest of the board dims.

## Non-goal check (design-00003 §5)

No view state leaks into the DSL: `lib/dsl/serialize.ts` `toModel` serializes
edges as `{id, source, target, relation}` and nodes without view fields;
`focusState`/`curvature` are render-only. Round-trip/autosave E2E still pass.

### Notes

1. `RelationEdge` has no dedicated unit test by design — per RA4/RA7 its
   acceptance is behavioural, covered by the two focus/label E2E tests.

## Verdict

**ACCEPTED** — all RA1–RA7 tasks implemented with passing tests, all quality
gates green, both §4 behaviours asserted by E2E, and no requirement unfinished.
plan-00003 → `resolved`.
