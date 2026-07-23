---
id: design-00009-compare-diff-surface
type: design
role: main
status: active
parent: spec-00008-model-versioning-compare
---

# Design: unified snapshot diff surface

> Technical design for [us-00023](../us/us-00023-compare-diff-view.md), replacing the
> side-by-side compare of [design-00008](../design/design-00008-versioning-compare-surface.md)
> §5 per [decision-00009](../decision/decision-00009-compare-as-unified-diff.md).
> Snapshot data / persistence / capture / restore / versions panel (design-00008
> §1–4, 6) are unchanged — only the presentation of a comparison changes. Terms
> follow [CONTEXT.md](../../CONTEXT.md).

## 1. Diff engine (pure)

New `web/lib/dsl/diff.ts` — a pure function over two DSL `Model`s, matched by stable
`id` (snapshots preserve ids):

```ts
export type DiffStatus = "added" | "removed" | "changed" | "unchanged";

export interface ModelDiff {
  nodes: Map<string, DiffStatus>;      // keyed by TARGET node id (added/changed/unchanged)
  removedNodes: ModelNode[];           // in base, not target
  edges: Map<string, DiffStatus>;      // keyed by target edge id
  removedEdges: ModelEdge[];
  summary: { added: number; removed: number; changed: number };
}

export function diffModels(base: Model, target: Model): ModelDiff;
```

- **Nodes**: for each target node, `added` if its id is not in base, else `changed`
  if the comparable payload differs, else `unchanged`. Comparable payload =
  `{ type, label, context, order, properties }` compared by stable
  `JSON.stringify` (ids excluded; `properties` already normalized by the schema).
  Base ids absent from target → `removedNodes`.
- **Edges**: matched by id; `changed` when `relation` differs (source/target are
  fixed by id). Base-only edges → `removedEdges`.
- **summary** counts added / removed / changed across nodes **and** edges (contexts
  and context relationships fold in the same way; kept minimal — node/edge counts
  drive the ACs). Counts are for the strip; the board colours only nodes+edges.

Unit-tested in isolation (`diff.test.ts`): add, remove, rename (→changed), identical
(→all unchanged, 0/0/0), reorder (order change →changed).

## 2. Diff board

`components/compare-diff-view.tsx` (replaces `compare-view.tsx`). The editor
view-swap branch (`compare.active`) and the `h-full` slot fix (issue-00014) carry
over unchanged.

- Base = `compare.leftId`, target = `compare.rightId` (pickers relabeled
  **Base → Target**; the A/B side-pick in the versions panel is unchanged, just
  relabeled).
- Compute `diff = diffModels(base.model, target.model)`.
- Render the **target** board read-only, reusing the `SnapshotBoard` pipeline
  (`fromModel` → `computeLayout` → `SnapshotNode` / `RelationEdge`, own RF provider,
  nothing draggable/editable). Layout is the target's, so every carried element sits
  where it does in the target — one coherent layout.
- **Node status styling** — `SnapshotNode` gains an optional `data.diffStatus`
  (the diff board attaches it per node from `diff.nodes`):
  - `unchanged` → `opacity: 0.35`
  - `added` → green ring `boxShadow 0 0 0 3px #16a34a`
  - `changed` → amber ring `boxShadow 0 0 0 3px #f59e0b`
  Absent `diffStatus` (any non-diff use) → normal, so `SnapshotBoard` is unaffected.
- **Edge status** reuses `RelationEdge`'s existing focus dimming instead of new
  styling: map `unchanged → focusState "off"` (dimmed), `added`/`changed` →
  `focusState "on"` (highlighted + animated). `removedEdges` are simply not rendered.
- **Removed elements + summary**: a strip along the bottom (or under the pickers)
  shows `+N · −N · ~N` and lists `removedNodes` by type + label (they have no place
  in the target layout — decision-00009). `data-testid="diff-summary"`.

## 3. Wiring / cleanup

- `editor.tsx`: swap `<CompareView/>` → `<CompareDiffView/>`; the `boardView` guard
  and `compare.active` branch are unchanged.
- Delete `components/compare-view.tsx` (side-by-side) — replaced. `snapshot-board.tsx`
  and `snapshot-node.tsx` are **kept** (the diff board reuses both).
- Store `compare {active,leftId,rightId}` and its actions are reused as-is
  (leftId=base, rightId=target). No store shape change.

## 4. Boundaries / non-goals

- Removed elements are listed, not drawn on the board (no on-board ghosts) — a later
  enhancement if wanted.
- Diff granularity is element-level (added/removed/changed); no field-by-field diff
  UI beyond marking a node "changed".
- No three-way / N-way compare; exactly base vs target.

## Links

- Spec: spec-00008 · Decision: decision-00009 · US: us-00023 · Plan:
  plan-00016-compare-diff-view · Supersedes: design-00008 §5
