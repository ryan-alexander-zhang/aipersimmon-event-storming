---
id: design-00008-versioning-compare-surface
type: design
role: main
status: active
parent: spec-00008-model-versioning-compare
---

# Design: model versioning — snapshots + side-by-side compare surface

> Technical design for [spec-00008](../spec/spec-00008-model-versioning-compare.md),
> implementing [prd-00002](../prd/prd-00002-complex-business-analysis.md) FR10.
> Snapshot storage boundary fixed by
> [decision-00008](../decision/decision-00008-snapshots-outside-dsl.md). Terms
> follow [CONTEXT.md](../../CONTEXT.md). The Compare view reuses the Context-Map /
> Discovery-Mode surface pattern (isolated React Flow provider swapped into the
> board slot); snapshots reuse the discovery-wall transient-store + separate-key
> persistence pattern, but snapshots *persist*.

## 1. Snapshot data (FR10 / decision-00008)

A snapshot is a full, validated copy of the model DSL plus a name and timestamp —
no schema change, no `DSL_VERSION` bump.

```ts
// web/lib/store/store.ts (beside DiscoveryItem)
export interface Snapshot {
  id: string;
  name: string;
  createdAt: string; // ISO
  model: Model;      // full DSL Model (schema.ts), carries its own `version`
}
```

`captureSnapshot` builds `model` with `toModel(nodes, edges, contexts, meta,
contextRelationships)` — the same serializer used by export/save, so a snapshot is
exactly what the model would export. The **discovery wall is not part of a
snapshot** (it is scratch, outside the DSL — decision-00004).

## 2. Persistence (`web/lib/store/persistence.ts`)

Mirror the discovery-wall helpers, under a new key:

- `STORAGE_KEY_SNAPSHOTS = "event-storming:snapshots"`.
- `saveSnapshots(snapshots: Snapshot[])` — best-effort `JSON.stringify`, like
  `saveDiscovery`.
- `loadSnapshots(): Snapshot[]` — parse; for each entry run
  `modelSchema.safeParse(migrateToLatest(entry.model))`; **keep** entries that
  validate (with the migrated `Model`), **drop** the rest. This is where FR7 /
  us-00021-AC-7.1 (version + migrate, never crash) is satisfied — per-snapshot,
  not via the schema.
- `clearSnapshots()` — remove the key (used by "New").

The main-model `saveModel`/`exportJSON` are untouched: a snapshot never enters the
current model's export (us-00021-AC-6.1).

## 3. Store slice (`web/lib/store/store.ts`)

New state (snapshots persist; the two view flags are transient, like
`contextMapOpen`):

```ts
snapshots: Snapshot[];
versionsOpen: boolean;                                   // Versions panel visibility
compare: { active: boolean; leftId: string | null; rightId: string | null };
```

Actions:

- `captureSnapshot(name)` → push `{ id: nanoid(), name, createdAt:
  new Date().toISOString(), model: toModel(...) }`; returns id. Reads state only —
  the live model is not mutated (us-00021-AC-1.1).
- `renameSnapshot(id, name)` — map snapshots, patch one name (mirrors
  `renameContext`).
- `deleteSnapshot(id)` — filter it out; if it was a `compare` side, null that side
  and set `compare.active = false`.
- `restoreSnapshot(id)` — `setModel(fromModel(snap.model))`. The **confirm** lives
  in the UI (like `onNew`'s `window.confirm`), not the store. `setModel` already
  resets selection/isolate/walk/discovery/filter/contextMap and (see below) the
  versioning view flags; it does **not** touch `snapshots`.
- `toggleVersions()` — flip `versionsOpen`.
- `setCompareSide(side: "left" | "right", id)` — set `compare.leftId`/`rightId`.
  Shared by the Versions panel pickers and the Compare-view per-side pickers.
- `openCompare()` — set `compare.active = true` only when both sides are set
  (no-op otherwise); `closeCompare()` — set `active = false`.

Lifecycle:

- `setModel` and `clear` reset `versionsOpen = false` and `compare = { active:
  false, leftId: null, rightId: null }` (view-only, same as `contextMapOpen`).
- `clear()` ("New model") also empties `snapshots` (they belong to the discarded
  model); `setModel` (import / hydrate / restore) **leaves** `snapshots` intact —
  this is why `restoreSnapshot` can call `setModel` without wiping the list.

## 4. Autosave (`web/components/editor.tsx` → `useAutosave`)

- On mount: after `loadModel`/`loadDiscovery`, `const snaps = loadSnapshots(); if
  (snaps.length) useESStore.setState({ snapshots: snaps })`.
- In the debounced subscription: add `saveSnapshots(s.snapshots)` beside
  `saveModel`/`saveDiscovery`.

## 5. Compare surface (read-only, two isolated providers)

> **Superseded by [design-00009](./design-00009-compare-diff-surface.md)**
> (decision-00009): the two-pane side-by-side described below was replaced by a
> unified diff view. §1–4 and §6 (snapshot data / persistence / store / versions
> panel) remain the live design; only this §5 is historical.

`compare.active` is a third branch in the editor view-swap, before Context Map /
Discovery:

```
compare.active ? <CompareView/>
  : contextMapOpen ? <ContextMapCanvas/>
  : discoveryActive ? <DiscoveryCanvas/>
  : <ReactFlow .../>
```

- **`components/snapshot-board.tsx`** — `SnapshotBoard({ model }: { model: Model })`,
  a read-only render of one snapshot, in its **own** `<ReactFlowProvider>`:
  - `const { nodes, edges, contexts, level } = fromModel(model)`;
    `const laid = computeLayout(nodes, edges, contexts, level)` (the pure layout
    engine — same one the store uses).
  - Route edges with the existing `routeHandles(a, b)` and colour them via
    `RELATION_STYLE` + `MarkerType.ArrowClosed`, reusing `ElementNode` /
    `RelationEdge` (`nodeTypes` / `edgeTypes` copied from the live board). No focus,
    isolate, filter, drag, or search decoration — those are live-board concerns.
  - `nodesDraggable={false}`, `nodesConnectable={false}`, `elementsSelectable=
    {false}`, no `onConnect`/drag handlers, `fitView`. This enforces FR3 read-only.
- **`components/compare-view.tsx`** — a horizontal split (two `flex-1` columns),
  left = `compare.leftId`, right = `compare.rightId`. Each column: a small header
  (snapshot name · created time · level badge) with a `<select>` of all snapshots
  calling `setCompareSide(side, id)`, and a `<SnapshotBoard model={snap.model}/>`
  below. A "Close compare" button calls `closeCompare()`. Independent providers →
  independent pan/zoom per side.

Gate board chrome/panels on the live board only: extend the existing `boardView`
guard to `!discoveryActive && !contextMapOpen && !compare.active`.

## 6. Versions entry point

- **`components/versions-panel.tsx`** (mirrors `HealthPanel`): opened by
  `versionsOpen`. Contents:
  - "Capture snapshot" → `window.prompt` for a name → `captureSnapshot(name)`
    (skip on empty/cancel).
  - The snapshot list; each row: name, created time, level badge; per-row
    **Restore** (guarded by `window.confirm`, like `onNew`), **Rename**
    (`window.prompt`), **Delete**; and an "A"/"B" side toggle → `setCompareSide`.
  - A **Compare** button, enabled only when two distinct sides are chosen
    (disabled with < 2 snapshots — us-00022-AC-5.1) → `openCompare()`.
- **`components/toolbar.tsx`**: a "Versions" toggle (History icon) in the
  right-hand group, `aria-pressed={versionsOpen}` → `toggleVersions()`; sits beside
  Context Map / Health / Walk. Hide the board-only `FilterControls` in Compare the
  same way it is hidden in Discovery / Context Map.

## 7. Boundaries / non-goals

- **No semantic diff.** Compare is two boards side by side (FR10's "side by side"),
  not a computed added/removed/changed overlay. Highlighting differences is deferred.
- **No cross-file history.** Snapshots are browser-local and model-scoped; they do
  not travel in an exported `.json` (decision-00008). Importing a different model
  leaves existing snapshots in place — a documented boundary (spec-00008 §5), not a
  cross-model binding.
- **Restore is the only mutation.** Capture and compare are read-only over the live
  model; restore replaces it and is always confirmed.
- **No snapshot of the discovery wall.** Scratch state stays out (decision-00004).

## Links

- Spec: spec-00008 · Decision: decision-00008 (snapshots outside DSL) · US:
  us-00021, us-00022 · Plan: plan-00015-model-versioning-compare
