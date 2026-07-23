---
id: decision-00009-compare-as-unified-diff
type: decision
role: main
status: active
parent: spec-00008-model-versioning-compare
---

# Compare is a unified semantic diff, not two side-by-side boards

> Driven by [prd-00002](../prd/prd-00002-complex-business-analysis.md) FR10 and a
> usability finding on the shipped side-by-side compare. **Reverses** the
> [spec-00008](../spec/spec-00008-model-versioning-compare.md) §6 non-goal ("No
> semantic diff … Compare is visual side-by-side only") and supersedes the
> side-by-side presentation in [us-00022](../us/us-00022-compare-snapshots.md).

## Context

FR10 asked to "compare two versions side by side". That was built literally: two
independent read-only boards (spec-00008 / us-00022, verified in record-00015). In
use it does not work — a modeller who changed one element between two snapshots
cannot tell what differs.

The root cause is structural, not cosmetic. This tool's layout is **deterministic**:
`position = f(model)` (`computeLayout`, no hand-set coordinates — decision-00002).
So a single edit reflows the whole timeline: even *unchanged* elements land at
different coordinates on each side. Two side-by-side boards therefore never align,
and no amount of side-by-side highlighting fixes the misalignment — the panes are
laid out independently.

## Decision

Replace side-by-side compare with a **unified semantic diff**:

1. **Diff by stable id.** Snapshots preserve element ids, so a model-level diff of
   base → target matches nodes/edges/contexts/relationships by `id`:
   in-target-only = **added**, in-base-only = **removed**, in-both-but-differing =
   **changed**, else **unchanged**.
2. **One board, one layout.** Render the **target** snapshot's board (base and
   target are the two picks) with: unchanged **dimmed**, added **green ring**,
   changed **amber ring**. Because there is a single layout, differences read at a
   glance — solving the misalignment.
3. **Removed elements in a summary strip.** A removed element has no position in the
   target layout, so list it in a diff summary (`+N added · −N removed · ~N
   changed`) rather than forcing it onto the board. (On-board "ghost" rendering of
   removed elements is a possible later enhancement, out of scope here.)
4. **Side-by-side is dropped**, not kept as a toggle (Simplicity First). The two
   snapshot pickers remain, relabeled **base → target**.
5. **Invariants unchanged.** The diff view stays read-only and never mutates the
   live model (carried over from us-00022 FR-3/FR-4).

## Consequences

- spec-00008 §6 non-goal is reversed; the compare surface described in design-00008
  §5 is superseded by [design-00009](../design/design-00009-compare-diff-surface.md).
- us-00022 (side-by-side) is **archived**, superseded by us-00023 (unified diff).
  record-00015 remains valid as the point-in-time acceptance of the side-by-side
  build; it is not rewritten.
- New pure module: a model diff (`web/lib/dsl/diff.ts`). The snapshot data model,
  persistence, capture/restore, and versions panel (spec-00008 / decision-00008) are
  unaffected — only the *presentation* of a comparison changes.
- Detailed design (diff shape, styling, summary) is owned by design-00009 /
  plan-00016; this decision only fixes the direction.
