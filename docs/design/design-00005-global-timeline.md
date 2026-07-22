---
id: design-00005-global-timeline
type: design
role: main
status: active
parent: spec-00009-global-timeline-bounded-context-region
---

# Design: global timeline; bounded context as region

> Technical design for [spec-00009](../spec/spec-00009-global-timeline-bounded-context-region.md)
> (Option A of [decision-00005](../decision/decision-00005-global-timeline-bc-as-region.md)),
> resolving [issue-00010](../issue/issue-00010-no-global-timeline-bc-is-an-axis-segment.md).
> Settles the two open questions decision-00005 left: the **migration rule** and
> **context rendering**.

## 1. Model

- **`order` is global.** A Domain Event's `order` is a single board-wide timeline
  index. `x = column(order)` — no per-context base offset.
- **Concurrency = equal global `order`**, across contexts too: same column,
  stacked in parallel sub-lanes (generalises us-00009).
- **`context` is a plain attribute** of a node; it selects a colour/region, never
  an x-range.
- y (element-type band) is unchanged.

## 2. Migration rule (per-context → global) — resolves open question 1

Deterministic, lossless, no user re-sequencing required:

1. Sort every Domain Event by the **current visible order**:
   `(context.order, per-context order)`, contexts ranked by their `order`.
2. **Dense-rank** that sequence into `0..k-1`, so events that were **concurrent
   within a context** (equal per-context order) keep an equal global order.
3. Assign the rank as the new global `order`; `context` is retained as the
   attribute.

This preserves exactly what the board shows today (left→right sequence + within
-context concurrency). It does **not** fabricate cross-context interleaving —
old data carries no cross-context timing, so formerly-separate contexts stay
block-sequential until the Modeler re-sequences them (now possible for the first
time). Applied in `migrate.ts`; old files load unchanged in appearance.

## 3. Context rendering — resolves open question 2

- A context is drawn as a **translucent background region** spanning from the
  min to the max column its events occupy (`computeContextBoxes` is repurposed:
  the span is derived from member events' global columns, not a reserved block).
- **Regions may overlap** in x — expected and correct when contexts interleave in
  time; overlaps render as blended/nested bands with the label pinned at each
  region's left edge.
- Optional subtle **sticky tint** per context for quick identification
  (colour only; shape/label already distinguish element type).
- The exclusive column-group boxes and `CTX_GAP_COLS` x-partition are removed.

## 4. Component impact

| Area | Change |
|---|---|
| `lib/store/timeline.ts` | `normalizeContextOrders` → global `normalizeOrders`; `timelineOrder` = sort by `(order, id)` |
| `lib/store/store.ts` | `addNode` assigns next global `order`; concurrency global |
| `lib/dsl/schema.ts`, `migrate.ts` | `order` global; §2 migration; version bump if shape changes |
| `lib/layout/layout.ts` | column = global `order`; drop per-context base offset; `computeContextBoxes` → derived spans (may overlap) |
| `components/board-chrome.tsx`, `element-node.tsx` | context = region overlay + optional tint; remove column-group boxes |
| spec-00005 walkthrough | no code change — `timelineOrder` now equals the board |

## 5. Reproduction (the red baseline)

`web/lib/layout/global-timeline.test.ts` (issue-00010): two contexts
Ordering `[A, C]` + Payment `[B]`; assert the board's left→right x-order equals
`timelineOrder`. Currently the board is `[A, C, B]` (context blocks) while
`timelineOrder` is `[A, B, C]` — the test is red today (kept green in the suite
via `it.fails` until Phase 1 makes them equal, then converted to `it`).

## 6. Open risk

Overlapping region rendering is the least-certain UI piece; if it reads poorly,
fall back to sticky-tint-only for v1 and revisit regions with the strategic layer
(spec-00004). Does not affect the model/migration.
