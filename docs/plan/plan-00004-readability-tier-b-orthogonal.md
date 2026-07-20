---
id: plan-00004-readability-tier-b-orthogonal
type: plan
role: main
status: open
parent: spec-00001-mvp-editor
---

# Plan: board readability Tier B (orthogonal edge routing)

Builds the **orthogonal routing** half of
[design-00003](../design/design-00003-board-readability-at-scale.md) §3 Tier B:
replace bezier edges with right-angle (step) connectors with rounded corners so
the grid-aligned board reads cleanly. View/interaction layer only — **no DSL and
no layout-engine change** ([design-00002](../design/design-00002-structured-board.md)
invariants hold). Terms follow [CONTEXT.md](../../CONTEXT.md).

## Design

See design-00003 §3 Tier B. The banded layout is a grid (bands × timeline
columns) and `routeHandles` already picks a top/bottom or left/right handle pair
per edge, so step edges turn along the grid and avoid bezier's S-curves. This
plan changes only how the existing `RelationEdge` draws its path and how
parallel edges are separated; all Tier A behaviour (focus/dim, on-demand labels,
relation colour/weight, thicken + flow) is preserved.

## Scope

- In: swap `RelationEdge`'s path from `getBezierPath` to `getSmoothStepPath`
  (orthogonal + rounded corners); adapt parallel-edge separation from bezier
  `curvature` to a step offset; keep every Tier A behaviour.
- Out (deferred, later Tier B increment): **cross-context edge bundling / gutter**
  for the long inter-context connectors, and any node-avoiding router (ELK etc.).
  Cross-context edges use the same orthogonal path here; bundling is a separate
  plan if still needed after this ships.

## Tasks

| # | Task | Delivers (design ref) | Depends | Verify |
|---|---|---|---|---|
| TB1 | `RelationEdge`: draw with `getSmoothStepPath` (rounded corners) instead of `getBezierPath`; keep colour/weight, dim, on-demand label, focus thicken, and the `animated` flow | §3 Tier B "orthogonal routing" | — | run: edges render as right-angle connectors; focus/label/flow still work; existing E2E green |
| TB2 | Parallel-edge separation for step edges: replace the bezier `curvature` field with a step `offset` (or center shift); update `edge-spread` to emit it and adapt its unit tests; rename the view-only edge field accordingly | §3 Tier B (keeps RA6 intent) | TB1 | unit: siblings sharing a corridor get distinct offsets; run: parallel step edges no longer overlap |
| TB3 | Regression + visual + docs: keep unit/E2E green; add/adjust an E2E asserting edges still render + label-on-focus; confirm on the ride-hailing model that vertical slice chains and cross-context links read as clean right angles; note bundling deferred | §4 | TB1,TB2 | e2e + unit green; `tsc`, `lint`, `build` clean; visual check on the example |

## Detailed Acceptance Path

View-only; no new `us`/`spec` requirement. Acceptance is behavioural + quality
gates.

`resolved` only when:

- TB1–TB3 done; `tsc`, `bun run lint`, `bun run build` clean; unit coverage on
  `lib/**` stays ≥90% ([TESTING.md](../../TESTING.md)); existing unit + E2E
  suites stay green (Tier A focus/dim, on-demand labels, and flow unaffected).
- Edges render as **orthogonal (right-angle, rounded-corner)** connectors rather
  than bezier curves, verified visually on the ride-hailing example (vertical
  slice chains and cross-context links).
- Parallel edges sharing a corridor stay visually separated (no exact overlap),
  covered by the adapted `edge-spread` unit test.
- Model unchanged: export/import and autosave round-trips identical before/after
  (no view state leaks into the DSL).
