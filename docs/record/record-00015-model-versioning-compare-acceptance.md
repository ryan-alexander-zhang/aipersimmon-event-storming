---
id: record-00015-model-versioning-compare-acceptance
type: record
role: main
status: active
parent: plan-00015-model-versioning-compare
---

# Acceptance record: model versioning — snapshots + side-by-side compare

Acceptance evidence for [plan-00015](../plan/plan-00015-model-versioning-compare.md),
implementing [us-00021](../us/us-00021-capture-name-snapshot.md) and
[us-00022](../us/us-00022-compare-snapshots.md) per
[spec-00008](../spec/spec-00008-model-versioning-compare.md) /
[design-00008](../design/design-00008-versioning-compare-surface.md); snapshot
storage boundary per [decision-00008](../decision/decision-00008-snapshots-outside-dsl.md).
Delivered in three code stages (data + store, versions panel, compare view).
Verified 2026-07-23. An independent subagent cross-checked every us-00021 /
us-00022 GWT and all four spec-00008-XAC scenarios; verdict **PASS**. The one WEAK
item (AC-2.1's "creation times are shown" clause had no assertion) was closed by
giving the timestamp its own `snapshot-time` testid and asserting it in e2e.

## Gate results

- Unit: **229 passed** (`bun run test`); `lib/**` coverage ≥90% lines/funcs
  (`persistence.ts` 97.8% lines / 100% funcs, `store.ts` 100% lines / 98.8% funcs;
  all-files 99.5% lines / 99.0% funcs).
- E2E: **42 passed** (`bun run test:e2e`, Playwright/chromium).
- `bunx tsc --noEmit`, `bun run lint`, `bun run build` all clean.

## GWT / XAC coverage

| Id | Test(s) | Result |
| --- | --- | --- |
| us-00021-AC-1.1 (capture holds model, board unmutated) | store.test.ts "captures the current model … without mutating it" (ref-identical `nodes`); e2e capture flow | pass |
| us-00021-AC-2.1 (list shows name + creation time) | e2e snapshot-row name + `snapshot-time` assertion (`/\d/`) | pass (time check added to close WEAK) |
| us-00021-AC-3.1 (rename) | store.test.ts "renames and deletes snapshots" | pass |
| us-00021-AC-4.1 (delete) | store.test.ts same | pass |
| us-00021-AC-5.1 (restore replaces live model) | store.test.ts "restores a snapshot as the live model"; e2e restore-with-confirm | pass |
| us-00021-AC-6.1 (export excludes snapshots) | persistence.test.ts "keeps snapshots out of the model DSL"; e2e `exported.snapshots` undefined | pass |
| us-00021-AC-6.2 (survives reload) | persistence.test.ts round-trip; hydrate wiring editor.tsx | pass |
| us-00021-AC-7.1 (migrate old / drop invalid) | persistence.test.ts "migrates a snapshot whose model predates the current DSL" + "drops a schema-invalid snapshot" | pass |
| us-00022-AC-1.1 (two boards, correct sides) | e2e compare: left=as-is (1 event), right=to-be (2 events) | pass |
| us-00022-AC-2.1 (swap a side re-renders) | e2e switch left → to-be, 2 events | pass |
| us-00022-AC-3.1 (read-only + no live mutation) | e2e forced dblclick opens no textbox; normalized export byte-identical | pass |
| us-00022-AC-4.1 (close returns unchanged board) | e2e close compare → 2 events, export equals before | pass |
| us-00022-AC-5.1 (compare unavailable < 2) | e2e `compare-open` disabled; store.test.ts `openCompare` no-op with one side | pass |
| spec-00008-XAC-1.1 (export has no snapshots) | persistence.test.ts + e2e | pass |
| spec-00008-XAC-1.2 (capture/panel/compare don't change model) | e2e capture + open panel + compare → export unchanged | pass |
| spec-00008-XAC-2.1 (snapshot excludes discovery wall) | store.test.ts "excludes the discovery wall from a snapshot" | pass |
| spec-00008-XAC-3.1 (open/close compare byte-identical) | e2e compare open→close, normalized export equal | pass |

## Deliverables

- **Data / persistence**: `Snapshot { id, name, createdAt, model }` (store.ts, no DSL
  change); `event-storming:snapshots` key with `saveSnapshots` / `loadSnapshots`
  (per-snapshot `migrateToLatest` + `modelSchema.safeParse`, drop invalid) /
  `clearSnapshots` (persistence.ts); autosave hydrate + save (editor.tsx); "New"
  clears snapshots (toolbar.tsx).
- **Store**: `snapshots` state (persisted); `captureSnapshot` (via `toModel`),
  `renameSnapshot`, `deleteSnapshot` (clears a referencing compare side),
  `restoreSnapshot` (via `setModel(fromModel)`); transient `versionsOpen` +
  `compare {active,leftId,rightId}` with `toggleVersions` / `setCompareSide` /
  `openCompare` / `closeCompare`; `clear` empties snapshots, `setModel` keeps them.
- **UI**: `versions-panel.tsx` (capture / list / rename / delete / restore + A/B
  pick + Compare); toolbar Versions toggle; `snapshot-board.tsx` (read-only board
  from a Model, own RF provider) with `nodes/snapshot-node.tsx` (no edit wiring);
  `compare-view.tsx` (two independent boards + per-side pickers + close);
  `editor.tsx` view-swap (`boardView = !discoveryActive && !contextMapOpen &&
  !compareActive`).
- **CONTEXT.md**: Snapshot, Version Compare terms.

## Deferred (recorded, not gaps)

Per decision-00008 and spec-00008 §6: no semantic diff (compare is visual
side-by-side only); no cross-file / cross-machine snapshot sharing (snapshots are
browser-local and never travel in an exported `.json`); snapshots are model-scoped
— "New" clears them, import leaves them in place.

## Post-acceptance fix

[issue-00014](../issue/issue-00014-compare-view-zero-height-blank.md) (resolved
2026-07-23): the Compare view rendered blank because its root used `flex-1` inside
the editor's non-flex (`position: relative`) board slot, collapsing the boards to
zero height. The e2e node-count assertions passed (node DOM is present even in a
0-height container), so the acceptance run missed it — the tell was the React Flow
"parent needs width/height" warning, wrongly filed as non-fatal here. Fixed by
sizing the CompareView root with `h-full`; added a regression test asserting the
compare board's rendered height > 200 (now **43 e2e** total).
