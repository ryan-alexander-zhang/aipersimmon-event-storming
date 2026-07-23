---
id: design-00010-compare-diff-detail
type: design
role: main
status: active
parent: spec-00008-model-versioning-compare
---

# Design: field-level change detail in the compare diff

> Technical design for the us-00023 FR-8/FR-9 extension per
> [decision-00010](../decision/decision-00010-diff-field-level-detail.md). Deepens
> [design-00009](./design-00009-compare-diff-surface.md); the diff engine, board, and
> summary from design-00009 are reused and extended, not replaced. Terms follow
> [CONTEXT.md](../../CONTEXT.md).

## 1. Diff engine — carry before/after for changed nodes

Extend `web/lib/dsl/diff.ts`:

```ts
export interface FieldChange { field: string; before: unknown; after: unknown }
export interface ChangedNode { before: ModelNode; after: ModelNode; fields: FieldChange[] }
// added to ModelDiff:
changed: Map<string, ChangedNode>; // by target node id
```

When a node is classified `changed`, also record `{ before, after, fields }`, where
`fields` is the differing subset of `label, order, context, pivotal, state, kind,
priority, description` (each `{field, before, after}`). `nodes: Map<id,DiffStatus>`
is unchanged (still drives board styling); `changed` is the new detail channel. The
engine stays pure and value-only — no display strings, no name resolution.

## 2. Display model — resolve in the view

`compare-diff-view.tsx` builds a display map keyed by node id (it has both snapshots'
`contexts`, so it can resolve context **ids → names**):

```ts
interface DiffChange {
  renamedFrom?: string;   // previous label, when label changed
  chips: string[];        // compact inline chips (order direction, ★, state:…)
  detail: string;         // full multi-line "field: before → after", for the title
}
```

- **order** → chip `⬅ earlier` / `➡ later` from `before.order` vs `after.order`
  (never the raw number).
- **context** → chip `context ✎`; detail line `context: <baseName> → <targetName>`
  (names resolved from base/target `contexts`; unresolved/none → "Ungrouped").
- **pivotal** → chip `★ set` / `★ cleared`.
- **state / kind / priority** → chip `state: open → resolved` etc. (short enums fit).
- **description** → chip `description ✎`; detail carries the full before → after.
- **label** → `renamedFrom` (rendered as the struck-through old label, not a chip).
- `detail` = every changed field as one `label: before → after` line.

Keep chips to a small cap (e.g. 3) with a `+N` overflow; the full set is always in
`detail`.

## 3. Board + node rendering

- `snapshot-board.tsx`: accept an optional `changes?: Map<string, DiffChange>`;
  attach `data.diffChange = changes.get(id)` to each node alongside the existing
  `data.diffStatus`.
- `snapshot-node.tsx`: when `data.diffChange` is present —
  - if `renamedFrom`, render the old label **struck-through** (muted) beneath the new
    label;
  - render `chips` as small tags in a wrap row;
  - set the node `div`'s `title` to `detail` (native hover tooltip = the B′
    field-level detail; cheap, positioning-free, testable via the `title` attribute).
    A richer floating popover is a later polish, not v1.

## 4. Summary strip

Unchanged from design-00009 (`+N · −N · ~N` + removed list). The changed detail now
lives on the elements, not the strip.

## 5. Boundaries / non-goals

- No spatial "ghost + arrow" for moved elements (deferred — decision-00010); order is
  conveyed by the direction chip + the element's new column.
- Detail tooltip is the native `title` in v1 (plain text); a styled popover is a
  later enhancement.
- No field-level diff for edges / contexts / context relationships beyond the
  existing added/removed/changed classification.

## Links

- Spec: spec-00008 · Decision: decision-00010 (patch of decision-00009) · US:
  us-00023 (FR-8/FR-9) · Plan: plan-00017-compare-diff-detail · Extends: design-00009
