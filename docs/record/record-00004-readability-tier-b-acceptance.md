---
id: record-00004-readability-tier-b-acceptance
type: record
role: main
status: active
parent: plan-00004-readability-tier-b-orthogonal
---

# Acceptance record: board readability Tier B (orthogonal routing) (plan-00004)

Acceptance evidence for [plan-00004-readability-tier-b-orthogonal](../plan/plan-00004-readability-tier-b-orthogonal.md),
implementing the orthogonal-routing half of
[design-00003](../design/design-00003-board-readability-at-scale.md) §3 Tier B.
Verified 2026-07-20. View-only (no DSL/layout change); acceptance is behavioural
+ quality gates.

## Gate results

- Unit: **87 passed** (`bun run test`). Coverage on `lib/**`: **90.96% branch /
  99.18% line** (≥90% bar met).
- E2E: **17 passed** (Playwright/chromium against the dev server).
- `tsc --noEmit`, `bun run lint`, `bun run build` clean.

## Task coverage

| Task | Delivered | Evidence |
| --- | --- | --- |
| TB1 orthogonal path | yes | `components/edges/relation-edge.tsx` uses `getSmoothStepPath` (rounded corners, `CORNER_RADIUS=8`); colour/weight, dim, on-demand label, focus thicken, and `animated` flow all preserved |
| TB2 parallel-edge separation for step edges | yes | `lib/layout/edge-spread.ts` `computeEdgeOffsets` returns symmetric px offsets; `RelationEdge` applies them as a `centerX`/`centerY` bump; view-only field renamed `curvature`→`pathOffset`; `edge-spread.test.ts` (distinct + symmetric offsets) |
| TB3 verify + visual | yes | full unit/E2E green; visual check on the ride-hailing model |

## Success criterion

- Edges render as **orthogonal (right-angle, rounded-corner)** connectors, not
  bezier — confirmed visually on the ride-hailing example (vertical slice chains
  and cross-context links are axis-aligned).
- Parallel edges sharing a corridor stay separated — `edge-spread` unit tests
  (fan-out, convergence, symmetric fan) pass.
- Existing Tier A behaviour intact: E2E `relation labels appear only for the
  focused node`, `focusing a node dims the rest of the board`, and `focused
  edges flow (animated)` all pass.
- Model unchanged: export/import round-trip and autosave E2E pass; `pathOffset`
  is render-only and never serialized.

### Deferred (out of scope, noted in plan-00004)

Cross-context edge bundling / gutter and any node-avoiding router (ELK) are not
part of this increment; cross-context edges use the same orthogonal path.

## Verdict

**ACCEPTED** — orthogonal routing shipped with parallel-edge separation adapted,
all quality gates green, Tier A behaviour preserved, no DSL leakage.
plan-00004 → `resolved`.
