---
id: plan-00016-compare-diff-view
type: plan
role: main
status: resolved
parent: spec-00008-model-versioning-compare
---

# Plan: unified snapshot diff view

Implements [us-00023](../us/us-00023-compare-diff-view.md) per
[spec-00008](../spec/spec-00008-model-versioning-compare.md) /
[design-00009](../design/design-00009-compare-diff-surface.md); direction fixed by
[decision-00009](../decision/decision-00009-compare-as-unified-diff.md). Replaces the
side-by-side compare (us-00022) with a unified diff. **No store/DSL/persistence
change** — only the diff engine (new pure module) and the compare presentation.
Terms follow [CONTEXT.md](../../CONTEXT.md).

## Stage A — diff engine (own commit)

| # | Task | Verify |
|---|---|---|
| A1 | `web/lib/dsl/diff.ts`: `diffModels(base, target)` → `{ nodes, removedNodes, edges, removedEdges, summary }`, matched by id; node payload compared by `{type,label,context,order,properties}`. | unit `diff.test.ts`: add→added, drop→removed, rename→changed, reorder→changed, identical→all unchanged + 0/0/0 (us-00023-AC-1.1/1.2/2.1/3.1) |
| — | **Checkpoint + commit** engine. | tsc/lint/tests green |

## Stage B — diff view (own commit)

| # | Task | Verify |
|---|---|---|
| B1 | `snapshot-node.tsx`: optional `data.diffStatus` → unchanged dim / added green ring / changed amber ring; absent = normal. | unit/e2e: added node ringed, unchanged dimmed |
| B2 | `components/compare-diff-view.tsx` (replaces `compare-view.tsx`): base/target pickers; `diffModels`; render target via `SnapshotBoard` pipeline with per-node `diffStatus`; edges → `RelationEdge` focusState (unchanged off / added·changed on); `diff-summary` strip with `+N·−N·~N` and removed list; close. | e2e: as-is→to-be adds 1 → target board shows added ring + summary +1; swap target recomputes; close leaves board intact (us-00023-AC-1.1/2.1/4.1/6.1) |
| B3 | `editor.tsx`: swap `<CompareView/>`→`<CompareDiffView/>` (branch + `boardView` guard unchanged); delete `compare-view.tsx`; keep `snapshot-board.tsx`/`snapshot-node.tsx`. | e2e: open diff read-only, export byte-identical (us-00023-AC-5.1) |
| B4 | versions panel: relabel side pickers **Base/Target** (tooltips); keep A/B icons + ≥2 gate. | e2e: Compare disabled < 2 (us-00023-AC-7.1) |
| — | **Checkpoint + commit** diff view. | tsc/lint/build/tests green |

## Stage C — docs

| # | Task | Verify |
|---|---|---|
| C1 | Archive `us-00022` (superseded by us-00023). Update `spec-00008`: §2 US table (us-00022 archived → us-00023 active), §4 sketch, §6 non-goal reversal, links to design-00009/plan-00016. Add note in `design-00008` §5 pointing to design-00009. | statuses + links correct; one live compare story |
| C2 | CONTEXT.md: refine **Version Compare** to "a unified read-only diff of two Snapshots (added / removed / changed)". | glossary matches code |
| C3 | Promote us-00023/design-00009/decision-00009 → active; plan → open. | statuses correct |

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- Both code stages done; `tsc`, `bun run lint`, `bun run build` clean; unit + e2e
  green; `lib/**` coverage ≥90% (lines/funcs) held.
- Behavioural: open a diff of two snapshots → target board with unchanged dimmed,
  added/changed ringed, removed listed, correct `+N·−N·~N`; swap base/target
  recomputes; diff is read-only and never mutates the live model; Compare disabled
  with < 2 snapshots.
- A subagent verifies from the docs that every us-00023 GWT has a passing test and no
  requirement is unfinished; a `docs/record/` acceptance checklist links the ids
  (CLAUDE.md §7). Any gap blocks `resolved`.

**Verified 2026-07-23** — subagent verdict PASS on all 8 us-00023 ACs, no MISSING/WEAK.
Acceptance evidence in
[record-00016-compare-diff-view-acceptance](../record/record-00016-compare-diff-view-acceptance.md).
235 unit + 43 e2e green; tsc/lint/build clean; `diff.ts` 100% lines/funcs.
