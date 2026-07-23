---
id: record-00016-compare-diff-view-acceptance
type: record
role: main
status: active
parent: plan-00016-compare-diff-view
---

# Acceptance record: unified snapshot diff view

Acceptance evidence for [plan-00016](../plan/plan-00016-compare-diff-view.md),
implementing [us-00023](../us/us-00023-compare-diff-view.md) per
[spec-00008](../spec/spec-00008-model-versioning-compare.md) /
[design-00009](../design/design-00009-compare-diff-surface.md); direction fixed by
[decision-00009](../decision/decision-00009-compare-as-unified-diff.md). Replaces the
side-by-side compare (us-00022, archived) after a usability finding: deterministic
layout reflows both boards independently, so two panes never align. Verified
2026-07-23. An independent subagent cross-checked every us-00023 GWT; verdict
**PASS**, no MISSING/WEAK.

## Gate results

- Unit: **235 passed** (`bun run test`); `lib/**` coverage ≥90% (`diff.ts` 100%
  lines/funcs; all-files 99.5% lines / 99% funcs).
- E2E: **43 passed** (`bun run test:e2e`, chromium); the "parent needs width/height"
  warning stays at 0 (issue-00014 held).
- `bunx tsc --noEmit`, `bun run lint`, `bun run build` all clean.

## GWT coverage

| Id | Test(s) | Result |
| --- | --- | --- |
| us-00023-AC-1.1 (added marked; unchanged carried) | diff.test.ts "target-only node as added"; e2e diff "+1 added" + target board 2 events | pass (unit + e2e) |
| us-00023-AC-1.2 (renamed kept = changed) | diff.test.ts "relabelled kept node as changed" | pass (unit) |
| us-00023-AC-2.1 (removed listed + counted) | diff.test.ts "base-only node as removed"; e2e swap → "−1 removed" + diff-removed lists it | pass (unit + e2e) |
| us-00023-AC-3.1 (identical → all unchanged, 0/0/0) | diff.test.ts "identical models … 0/0/0" | pass (unit) |
| us-00023-AC-4.1 (change a side → recompute) | e2e swap base/target → summary flips +1 → −1 | pass (e2e) |
| us-00023-AC-5.1 (read-only, no live mutation) | e2e forced dblclick opens no editor; normalized export == before | pass (e2e) |
| us-00023-AC-6.1 (close → unchanged board) | e2e close → live 2 events, normalized export == before | pass (e2e) |
| us-00023-AC-7.1 (< 2 snapshots → no Compare) | e2e compare-open disabled + side buttons count 0 | pass (e2e) |

Notes (subagent, not gaps): AC-4.1 swaps the pair rather than pointing at a distinct
third snapshot, but a genuine recompute is observed; AC-5.1/6.1 use `normalize()`
(sorted) export equality — the file-wide convention for the "unchanged model" check.

## Deliverables

- **Diff engine**: `web/lib/dsl/diff.ts` — pure `diffModels(base, target)` matched by
  id → `{ nodes, removedNodes, edges, removedEdges, summary }`; node payload compared
  by `{type,label,context,order,properties}`.
- **Diff surface**: `compare-diff-view.tsx` (base/target pickers + target board +
  `+N·−N·~N` summary strip with removed list + close); `snapshot-board.tsx` extended
  with an optional `diff` prop (tags nodes with status, dims/highlights edges);
  `snapshot-node.tsx` renders `diffStatus` (unchanged dim / added green ring / changed
  amber ring). `editor.tsx` swaps `<CompareDiffView/>` into the `compare.active`
  branch; `compare-view.tsx` (side-by-side) deleted. Versions-panel side pickers
  relabeled base/target.
- **Docs**: us-00022 archived (superseded); spec-00008 §2/§4/§6 + links updated;
  design-00008 §5 marked superseded; decision-00009/us-00023/design-00009/plan-00016
  added; CONTEXT.md **Version Compare** refined to the unified-diff definition.

## Post-acceptance fix

[issue-00015](../issue/issue-00015-compare-diff-overlaps-hidden-bands.md) (resolved
2026-07-23): stickies overlapped in the diff when the snapshots were captured at a
band-hiding level (e.g. Big Picture) — the board laid out at the snapshot's stored
level (collapsing hidden bands) while rendering every element, so hidden-type stickies
piled up. Fixed by laying the diff board out at the full `"design"` level; added a
regression test (Command must sit above the Domain Event → now **44 e2e**).

## Deferred (recorded, not gaps)

Per decision-00009 / spec-00008 §6: no on-board ghosts for removed elements (listed
in the summary only), no field-by-field change detail beyond marking a node changed,
no N-way compare.
