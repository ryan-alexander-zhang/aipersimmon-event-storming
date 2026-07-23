---
id: plan-00015-model-versioning-compare
type: plan
role: main
status: resolved
parent: spec-00008-model-versioning-compare
---

# Plan: model versioning — snapshots + side-by-side compare

Implements [us-00021](../us/us-00021-capture-name-snapshot.md) and
[us-00022](../us/us-00022-compare-snapshots.md) per
[spec-00008](../spec/spec-00008-model-versioning-compare.md) /
[design-00008](../design/design-00008-versioning-compare-surface.md); snapshot
storage boundary per
[decision-00008](../decision/decision-00008-snapshots-outside-dsl.md). **No DSL
change** — snapshots are stored `Model`s under their own local key. Delivered in
three code stages: **data + store, then versions panel (capture/manage), then
compare view** — a checkpoint between each. Terms follow [CONTEXT.md](../../CONTEXT.md).

## Stage A — data, persistence, store (own commit)

| # | Task | Verify |
|---|---|---|
| A1 | `persistence.ts`: `STORAGE_KEY_SNAPSHOTS`; `saveSnapshots` / `loadSnapshots` (per-snapshot `migrateToLatest` + `modelSchema.safeParse`, drop invalid) / `clearSnapshots`. | unit: round-trip; older-DSL snapshot migrates on load; corrupt entry dropped, no throw (us-00021-AC-6.2/7.1) |
| A2 | `store.ts`: `Snapshot` type; `snapshots` state; `captureSnapshot` (via `toModel`), `renameSnapshot`, `deleteSnapshot`, `restoreSnapshot` (via `setModel(fromModel)`). `clear` empties snapshots; `setModel` keeps them. | unit: capture holds current model + leaves board unchanged; rename/delete; restore replaces model; capture excludes discovery wall (us-00021-AC-1.1/3.1/4.1/5.1, spec-00008-XAC-2.1) |
| A3 | `store.ts`: transient `versionsOpen` + `compare {active,leftId,rightId}`; `toggleVersions`, `setCompareSide`, `openCompare` (both sides set), `closeCompare`; reset in `setModel`/`clear`; `deleteSnapshot` clears a compare side that referenced it. | unit: openCompare needs two sides; delete clears side; view flags reset on setModel/clear |
| A4 | `editor.tsx` `useAutosave`: hydrate `loadSnapshots`; add `saveSnapshots` to the debounced subscription. `toolbar.tsx` `onNew`: `clearSnapshots()`. | unit/e2e: snapshot survives reload; New clears snapshots |
| — | **Checkpoint + commit** data layer. | tsc/lint/build/tests green |

## Stage B — versions panel: capture & manage (own commit)

| # | Task | Verify |
|---|---|---|
| B1 | `components/versions-panel.tsx` (mirrors `HealthPanel`): capture (prompt name), list (name · time · level badge), per-row Restore (confirm) / Rename / Delete, A/B side toggles, Compare button (disabled < 2 or sides unset). | run/e2e: capture two, rename, delete, restore-with-confirm (us-00021-AC-1.1/2.1/3.1/4.1/5.1, us-00022-AC-5.1) |
| B2 | `toolbar.tsx`: "Versions" toggle (History icon), `aria-pressed`, `toggleVersions`; hide `FilterControls` when compare active (extend the existing Discovery/Context-Map guard). | e2e: toggle panel; filter hidden in compare |
| — | **Checkpoint + commit** capture/manage. | tsc/lint/build/tests green |

## Stage C — compare view (own commit)

| # | Task | Verify |
|---|---|---|
| C1 | `components/snapshot-board.tsx`: `SnapshotBoard({ model })` — `fromModel` → `computeLayout` → read-only `ReactFlow` (own provider; `ElementNode`/`RelationEdge`; `routeHandles` + `RELATION_STYLE`; not draggable/connectable/selectable; `fitView`). | unit/e2e: renders a snapshot's nodes+edges; nothing draggable (us-00022-AC-3.1) |
| C2 | `components/compare-view.tsx`: horizontal split, left/right `SnapshotBoard` from `compare.leftId`/`rightId`; per-side `<select>` → `setCompareSide`; "Close compare" → `closeCompare`. | e2e: two boards render left=as-is/right=to-be; swap a side; close (us-00022-AC-1.1/2.1/4.1) |
| C3 | `editor.tsx`: view-swap branch `compare.active ? <CompareView/> : …`; extend `boardView` guard to also exclude `compare.active`. | e2e: open/close compare; live board export byte-identical (spec-00008-XAC-1.2/3.1, us-00022-AC-4.1) |
| — | **Checkpoint + commit** compare. | tsc/lint/build/tests green |

## Stage D — docs

| # | Task | Verify |
|---|---|---|
| D1 | CONTEXT.md: add **Snapshot** and **Version compare (as-is / to-be)**. | glossary consistent with code |
| D2 | Promote us-00021/us-00022/spec-00008/design-00008/decision-00008 → `active`; this plan → `open`. | statuses correct |

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- All three code stages done; `tsc`, `bun run lint`, `bun run build` clean; unit +
  e2e green; `lib/**` coverage ≥90% (lines/funcs) held.
- Behavioural: capture named snapshots; list/rename/delete; restore-with-confirm
  replaces the model; compare two snapshots side by side read-only; snapshots
  survive reload; "New" clears them; the current model's export never contains
  snapshots; capture/compare never mutate the live board.
- A subagent verifies from the docs that every us-00021 / us-00022 GWT and
  spec-00008-XAC scenario has a passing test and no requirement is unfinished; a
  `docs/record/` acceptance checklist links the ids (CLAUDE.md §7). Any gap blocks
  `resolved`.

**Verified 2026-07-23** — subagent verdict PASS; the one WEAK item (us-00021-AC-2.1
"creation times are shown" had no assertion) closed by adding a `snapshot-time`
testid + e2e assertion. Acceptance evidence in
[record-00015-model-versioning-compare-acceptance](../record/record-00015-model-versioning-compare-acceptance.md).
229 unit + 42 e2e green; tsc/lint/build clean; `lib/**` coverage ≥90% held.
