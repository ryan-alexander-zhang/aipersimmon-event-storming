---
id: issue-00014-compare-view-zero-height-blank
type: issue
role: main
status: resolved
parent: spec-00008-model-versioning-compare
---

# Compare view renders blank — its board slot collapses to zero height

## Problem

Opening Compare (spec-00008 FR10 / us-00022) shows **nothing**: both side-by-side
boards are blank, so a modeller who captured a snapshot, changed the model, and
compared sees "no difference at all" — the snapshots are fine, but neither board is
visible (user report).

## Context / trigger

Introduced with the Compare surface (`compare-view.tsx`, this feature). Reproduces
every time Compare is opened. The React Flow dev console shows *"The parent
container needs a width and a height to render the graph"* — noted as "transient"
during acceptance but it is in fact the defect.

## Root cause (first principles)

1. **Observed**: the `.react-flow` element inside `compare-left` has a bounding-box
   **height of 0**. **Expected**: it fills the board slot like the live board does.
2. **Mechanism**: the editor board slot is `components/editor.tsx` `<div className=
   "relative flex-1">` — `position: relative`, **not** `display: flex`. The live
   board works because a plain `<ReactFlow>` sets its own root to `height: 100%`,
   which resolves against that slot's definite (flex-item) height. But
   `components/compare-view.tsx` renders its root as
   `<div className="flex min-h-0 flex-1 flex-col">`. `flex-1` only stretches a child
   of a **flex** parent; the slot is not a flex container, so CompareView's height
   falls back to `auto` (content height). Its inner board rows are `flex-1` measured
   against that auto height, and the boards are `height: 100%` of nothing → the
   whole chain collapses to 0.
3. **True root cause**: CompareView relied on `flex-1` to fill a **non-flex** parent.
   It never asserts its own height. It is *not* a React Flow bug, a provider bug, or
   a snapshot-data bug (the models are correct and the node DOM is present — it is
   purely zero-sized). The other swap-in views (`ContextMapCanvas`,
   `DiscoveryCanvas`) avoid this because each returns a `<ReactFlow>` whose root is
   `height: 100%`, not a `flex-1` wrapper.

## Reproduction (test-first)

`web/e2e/editor.spec.ts` "compare boards render with a non-zero height
[issue-00014]": capture two snapshots, open Compare, and assert the `compare-left`
`.react-flow` bounding box height `> 200`. Before the fix it is **0** and the test
fails.

## Fix

`compare-view.tsx`: make the CompareView root fill the slot by height instead of by
flex — `flex h-full min-h-0 flex-col` (`h-full` = `height: 100%`, which resolves
against the slot's definite height). The inner board rows then divide a real height
and each `<SnapshotBoard>` fills its column.

## Verification

**Resolved 2026-07-23.** The repro test now measures a `compare-left` `.react-flow`
height > 200 (was 0), and the React Flow *"parent container needs a width and a
height"* console warning is gone (0 occurrences across the e2e run) — confirming the
container, not just a symptom, was fixed. 43 e2e green; 229 unit green; tsc/lint/build
clean. Real-browser confirmed: Compare shows both snapshots' boards side by side.
