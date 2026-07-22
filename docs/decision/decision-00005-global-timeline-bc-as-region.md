---
id: decision-00005-global-timeline-bc-as-region
type: decision
role: main
status: active
parent: prd-00002-complex-business-analysis
---

# One global timeline; Bounded Context is an orthogonal region, not an axis segment

## Context

Triggered by [issue-00010](../issue/issue-00010-no-global-timeline-bc-is-an-axis-segment.md):
the board has no global timeline because
[decision-00002](./decision-00002-structured-board-not-free-canvas.md) modeled a
Bounded Context as a stretch of the x-axis ("column groups along the timeline"),
so each context carries a private per-context `order` and contexts are
concatenated left→right. Cross-context events cannot interleave, "simultaneous
across contexts" is unrepresentable, and the walkthrough (spec-00005) cannot
follow a true global order.

Event Storming has **one** timeline: the whole business's Domain Events on a
single left→right chronological/causal line. Bounded Contexts are clusters that
emerge over it and may overlap in time — an attribute of events, not parallel
timelines. The axes are already spoken for: **x = time**, **y = element-type
band**. A Bounded Context therefore has no free axis of its own.

Two credible models were considered:

- **Option A — single global timeline; Bounded Context as an orthogonal
  attribute** shown by sticky colour / a background region (which may span or
  overlap columns) / pivotal dividers. `order` is global; context does not
  consume an axis.
- **Option B — Bounded Context as a horizontal swimlane** (y), with the
  element-type bands nested inside each lane, all lanes sharing one aligned
  global x (time). Keeps context separation *and* a shared timeline, but needs a
  two-level y layout (lane → band) — a much larger layout-engine change.

## Decision

Adopt **Option A**.

1. **One global timeline.** A Domain Event's `order` is a single global position
   on the board's x-axis, comparable across the whole model. Concurrency = equal
   global `order` (generalises us-00009 from per-context to global).
2. **Bounded Context is an orthogonal attribute, not an axis segment.** It no
   longer owns a range of columns. It is rendered as sticky colour and/or a
   background region that spans the columns its events occupy — regions may
   overlap in time, which is expected.
3. **The layout keeps x = time, y = element-type band** (decision-00002's band
   model and "layout is derived, never dragged" invariant are unchanged).
4. **Walkthrough and board both derive from the one global `order`**, so
   `timelineOrder` equals the board's left→right order (issue-00010 resolved).

Option B is deferred: the swimlane model may return with the strategic layer
(spec-00004) / scale work (spec-00006) if per-context lanes prove necessary, but
it is not needed to restore a correct global timeline.

## Consequences

- **Supersedes** the context-as-x-axis parts of
  [decision-00002](./decision-00002-structured-board-not-free-canvas.md) —
  clause 3 ("Bounded contexts ... column groups along the timeline") and the
  "context + timeline order → column" half of clause 1. decision-00002's other
  clauses (structured board not free canvas; layout derived not dragged; fixed
  type-bands; slice builder) stand. On acceptance, decision-00002 and
  `CONTEXT.md` (Bounded Context, Timeline, Concurrent Events) are updated to
  record the global-timeline model.
- **DSL**: `order` becomes global; a migration must re-derive a single global
  order from the current per-context orders + context placement (per-context
  `0..k` → global sequence) so existing files still load. Versioned via
  `web/lib/dsl/migrate.ts`.
- **Layout engine** (`web/lib/layout/layout.ts`): drop per-context column blocks
  (`computeContextBoxes` / `CTX_GAP_COLS` as the x-partition); compute columns
  from the global `order`; render context as colour/region overlay instead.
- **Timeline model** (`web/lib/store/timeline.ts`): `normalizeContextOrders`
  becomes a global normalization; `timelineOrder` becomes a plain global sort;
  us-00006 (bounded contexts + timeline) and us-00009 (concurrency) semantics
  shift accordingly and their tests update.
- **Walkthrough** (spec-00005): `timelineOrder` now matches the board; the
  cross-context divergence noted in record-00010 disappears.
- This is a Phase-2 change of real size; implementation is tracked in a follow-up
  `spec`/`plan` under [prd-00002](../prd/prd-00002-complex-business-analysis.md),
  not in the issue or this decision.

## Open questions (resolve in the follow-up spec)

- Exact context rendering: sticky tint vs. background region vs. both; how
  overlapping regions read.
- Migration rule for ordering events across formerly-separate contexts (stable,
  deterministic; likely interleave by existing block order then local order, or
  require the user to re-sequence).
