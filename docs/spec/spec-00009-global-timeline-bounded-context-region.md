---
id: spec-00009-global-timeline-bounded-context-region
type: spec
role: main
status: active
parent: prd-00002-complex-business-analysis
---

# Spec: global timeline; bounded context as a region

> The shippable capability: rebuild the board around **one global timeline** and
> render **Bounded Context as an orthogonal region/attribute**, not a segment of
> the x-axis. Implements
> [decision-00005](../decision/decision-00005-global-timeline-bc-as-region.md) and
> resolves [issue-00010](../issue/issue-00010-no-global-timeline-bc-is-an-axis-segment.md).

## 1. Context

Per [decision-00005](../decision/decision-00005-global-timeline-bc-as-region.md):
x = time (one global `order`), y = element-type band (unchanged); a Bounded
Context no longer owns a range of columns. This re-scopes
[us-00006](../us/us-00006-bounded-contexts-timeline.md) (contexts along an ordered
timeline) and [us-00009](../us/us-00009-concurrent-events.md) (concurrency is now
a global-order tie); their tests change with this spec. New behaviour lives in
[us-00015](../us/us-00015-global-timeline.md).

CONTEXT.md terms **Bounded Context**, **Timeline**, **Concurrent Events** and
decision-00002 clauses 1/3 are rewritten **as part of this spec's implementation**
(plan-00011), when the code actually changes — not before, to avoid a
glossary-vs-code gap.

## 2. User Stories

| Story | Doc | Status | Summary |
| --- | --- | --- | --- |
| US15 | [us-00015-global-timeline](../us/us-00015-global-timeline.md) | draft | One global timeline; events interleave across contexts; context shown as region; board order = walkthrough order |

Re-scoped (semantics change, no new doc): us-00006 (context is a region, not a
column block), us-00009 (concurrency = equal global order).

## 3. Cross-cutting requirements

- **spec-00009-XFR-1** (Ubiquitous) The system shall migrate existing per-context
  DSL documents to a single global `order` deterministically, so older files
  import without loss.

### Acceptance (XAC)

- **spec-00009-XAC-1.1** (spec-00009-XFR-1)
  Given a pre-spec file whose events carry per-context orders
  When it is imported
  Then every Domain Event receives a global `order` and the model loads without
  error

## 4. Technical Design

Full design in [design-00005](../design/design-00005-global-timeline.md) (global
-order model, migration rule, context-region rendering). Sketch:

- **DSL / migration** (`schema.ts`, `migrate.ts`): `order` is a global timeline
  index; `context` stays a node attribute. A migration derives a global order
  from the current `(context block order, per-context order)` so old files keep
  their visible left→right sequence. Version bump if the shape needs it.
- **Timeline** (`lib/store/timeline.ts`): `normalizeContextOrders` → a global
  `normalizeOrders`; `timelineOrder` becomes a plain sort by `(order, id)`
  matching the board.
- **Layout** (`lib/layout/layout.ts`): columns come from the global `order`; drop
  the per-context column blocks (`computeContextBoxes`/`CTX_GAP_COLS` as an
  x-partition). A context becomes a **background region** spanning the columns its
  events occupy (regions may overlap) plus an optional sticky tint.
- **Store** (`store.ts`): `addNode` assigns the next **global** order;
  concurrency = equal global order.
- **Chrome** (`board-chrome.tsx`): context headers become region overlays, not
  column-group boxes.
- **Walkthrough** (spec-00005): no code change — `timelineOrder` now equals the
  board, so record-00010's cross-context divergence disappears.

## 5. Error handling

- Old per-context files → deterministic global order via the migration
  (spec-00009-XAC-1.1); no event dropped, no crash.

## Links

- PRD: prd-00002 · Decision: decision-00005 · Issue: issue-00010 · Plan:
  [plan-00011-global-timeline](../plan/plan-00011-global-timeline.md)
