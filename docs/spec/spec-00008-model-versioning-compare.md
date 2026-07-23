---
id: spec-00008-model-versioning-compare
type: spec
role: main
status: active
parent: prd-00002-complex-business-analysis
---

# Spec: model versioning + compare

> The shippable capability: capture **named snapshots** of the model and
> **compare two of them side by side** (e.g. as-is vs to-be). Delivers
> [prd-00002](../prd/prd-00002-complex-business-analysis.md) FR10. Snapshot
> storage boundary fixed by
> [decision-00008](../decision/decision-00008-snapshots-outside-dsl.md).

## 1. Context

analysis-00002 §2 (#8): the tool has one live model and no way to save a version,
step back, or hold as-is against to-be. This spec adds a local, named snapshot
store and a read-only side-by-side compare view.

A snapshot is a full validated copy of the model DSL (`toModel` output) plus a name
and timestamp. Per **decision-00008** snapshots live in their own local-storage
collection (`event-storming:snapshots`), **not** in the model DSL: `schema.ts` /
`migrate.ts` / `DSL_VERSION` are unchanged, and a snapshot never appears in the
current model's export. Snapshots are still versioned and migrated — per-snapshot,
each `Model` runs through `migrateToLatest` + validation on load. This deliberately
**overrides** the prd-00002 Risks note that listed FR10 as a schema extension.

Compare reuses the Context-Map / Discovery surface pattern (an isolated React Flow
provider swapped into the board slot); snapshots reuse the discovery transient-store
+ separate-key persistence pattern (but snapshots persist, they are not scratch).

New CONTEXT.md terms added at implementation (plan-00015): **Snapshot**,
**Version compare (as-is / to-be)**.

## 2. User Stories

| Story | Doc | Status | Summary |
| --- | --- | --- | --- |
| US21 | [us-00021-capture-name-snapshot](../us/us-00021-capture-name-snapshot.md) | active | Capture, name, list, rename, delete, and restore model snapshots |
| US22 | [us-00022-compare-snapshots](../us/us-00022-compare-snapshots.md) | archived | ~~View two snapshots side by side~~ — superseded by US23 (decision-00009) |
| US23 | [us-00023-compare-diff-view](../us/us-00023-compare-diff-view.md) | active | Compare two snapshots as a unified diff (added / removed / changed) |

## 3. Cross-cutting requirements

- **spec-00008-XFR-1** (Ubiquitous) The system shall keep snapshots in local
  storage separate from the model DSL; capturing, listing, comparing, and opening
  the versions panel shall never change the live model or its export. Restore is the
  sole exception — it replaces the live model, and only on explicit confirmation.
- **spec-00008-XFR-2** (Ubiquitous) The system shall capture a snapshot as a
  complete copy of the model DSL at capture time; the discovery wall (scratch state
  outside the DSL, decision-00004) is not part of a snapshot.
- **spec-00008-XFR-3** (Ubiquitous) The system shall keep the Compare view a
  distinct read-only view: entering or leaving it never mutates the live board.

### Acceptance (XAC)

- **spec-00008-XAC-1.1** (spec-00008-XFR-1)
  Given a populated board and one captured snapshot
  When the snapshot is exported via the model's export
  Then the export JSON contains no snapshots
- **spec-00008-XAC-1.2** (spec-00008-XFR-1)
  Given a populated board
  When the Modeler captures a snapshot, opens the versions panel, and opens Compare
  Then the live board's export is byte-identical to before those actions
- **spec-00008-XAC-2.1** (spec-00008-XFR-2)
  Given a board with events and a discovery wall with unconverged items
  When the Modeler captures a snapshot
  Then the snapshot's model holds the board's events and none of the wall items
- **spec-00008-XAC-3.1** (spec-00008-XFR-3)
  Given a populated board
  When the Modeler opens and closes the Compare view
  Then the board's nodes, edges, order, and contexts are byte-identical on export

## 4. Technical Design

Full design in [design-00008](../design/design-00008-versioning-compare-surface.md).
Sketch:

- **Data**: `Snapshot { id, name, createdAt, model: Model }` beside `DiscoveryItem`
  in `store.ts`. No schema change.
- **Persistence** (`persistence.ts`): `STORAGE_KEY_SNAPSHOTS`; `saveSnapshots` /
  `loadSnapshots` (per-snapshot `migrateToLatest` + `modelSchema.safeParse`, drop
  invalid) / `clearSnapshots`.
- **Store** (`store.ts`): `snapshots` state (persisted); transient `versionsOpen` +
  `compare {active,leftId,rightId}`; actions `captureSnapshot` (via `toModel`),
  `renameSnapshot`, `deleteSnapshot`, `restoreSnapshot` (via
  `setModel(fromModel(...))`), `toggleVersions`, `setCompareSide`, `openCompare`,
  `closeCompare`. `setModel`/`clear` reset the view flags; `clear` also empties
  `snapshots`, `setModel` keeps them.
- **Autosave** (`editor.tsx`): hydrate `loadSnapshots`; add `saveSnapshots` to the
  debounced subscription.
- **UI**: `snapshot-board.tsx` (read-only board from a `Model`, own RF provider);
  `versions-panel.tsx` (capture / list / rename / delete / restore / pick base+target
  + Compare); `editor.tsx` view-swap branch for `compare.active` (extend `boardView`
  guard); `toolbar.tsx` Versions toggle.
- **Compare presentation** is a **unified diff** (US23 / decision-00009 /
  [design-00009](../design/design-00009-compare-diff-surface.md)): `lib/dsl/diff.ts`
  (pure diff by id) + `compare-diff-view.tsx` (renders the target board with unchanged
  dimmed, added/changed ringed; removed listed in a summary strip). This replaced the
  original side-by-side `compare-view.tsx` (US22, archived).

## 5. Error handling & boundaries

- Corrupt / stale snapshot entry, or one on an older DSL → `loadSnapshots` migrates
  what it can and drops the rest; the app never crashes (us-00021-AC-7.1), matching
  the model-autosave robustness contract.
- Restore replaces the live model → guarded by `window.confirm`; capture and
  compare never mutate it (spec-00008-XFR-1).
- Compare with < 2 snapshots is unavailable (us-00022-AC-5.1).
- **Model-scoped, not file-scoped** (decision-00008): "New" clears snapshots;
  importing a different model leaves existing snapshots in place. Snapshots do not
  travel in an exported `.json`. This is a deliberate v1 boundary, not cross-model
  binding.

## 6. Non-goals

- ~~No semantic diff — Compare is visual side-by-side only.~~ **Reversed by
  [decision-00009](../decision/decision-00009-compare-as-unified-diff.md)**: Compare
  is now a unified semantic diff (US23). ~~No field-by-field change detail.~~ **Also
  reversed by [decision-00010](../decision/decision-00010-diff-field-level-detail.md)**:
  changed elements show before→after inline + on hover (US23 FR-8/9). Still out of
  scope: on-board ghosts / arrows for removed or moved elements (listed / chipped
  only), and N-way compare.
- No cross-file / cross-machine snapshot sharing (single-user, local — prd-00002).
- No snapshot of the discovery wall.

## Links

- PRD: prd-00002 (FR10) · Decisions:
  [decision-00008](../decision/decision-00008-snapshots-outside-dsl.md) (snapshots
  outside DSL), [decision-00009](../decision/decision-00009-compare-as-unified-diff.md)
  (compare = unified diff) · Designs:
  [design-00008](../design/design-00008-versioning-compare-surface.md) (snapshots),
  [design-00009](../design/design-00009-compare-diff-surface.md) (diff surface) · US:
  [us-00021](../us/us-00021-capture-name-snapshot.md),
  [us-00023](../us/us-00023-compare-diff-view.md) (us-00022 archived) · Plans:
  [plan-00015](../plan/plan-00015-model-versioning-compare.md) (snapshots),
  [plan-00016](../plan/plan-00016-compare-diff-view.md) (diff)
