---
id: us-00022-compare-snapshots
type: us
role: main
status: archived
parent: spec-00008-model-versioning-compare
---

> **Superseded by [us-00023](./us-00023-compare-diff-view.md)** (unified diff) per
> [decision-00009](../decision/decision-00009-compare-as-unified-diff.md). The
> side-by-side presentation described here shipped and was accepted (record-00015),
> then replaced because deterministic layout makes two independent boards impossible
> to align. Kept for history; not the live compare story.

# User Story: compare two snapshots side by side

As a Modeler,
I want to view two snapshots side by side as read-only boards,
so that I can compare an *as-is* model against a *to-be* model and see how the
design changed.

## Requirements (EARS)

- **us-00022-FR-1** (Event) When the Modeler selects two snapshots and opens
  Compare, the system shall render both models side by side as read-only boards,
  each laid out at its own stored level.
- **us-00022-FR-2** (Event) When the Modeler changes which snapshot a side shows,
  the system shall re-render that side with the newly selected snapshot.
- **us-00022-FR-3** (State) While Compare is open, the system shall keep both boards
  read-only (no node dragging, connecting, or editing) and shall not mutate the live
  model.
- **us-00022-FR-4** (Event) When the Modeler closes Compare, the system shall return
  to the live board with it unchanged.
- **us-00022-FR-5** (Unwanted) If fewer than two snapshots exist, then the system
  shall not offer Compare.

## Acceptance (GWT)

- **us-00022-AC-1.1** (us-00022-FR-1)
  Given snapshots "as-is" and "to-be"
  When the Modeler compares them
  Then two read-only boards render, the left showing "as-is" and the right "to-be"
- **us-00022-AC-2.1** (us-00022-FR-2)
  Given Compare open with "as-is" on the left
  When the Modeler switches the left side to "to-be"
  Then the left board re-renders as "to-be"
- **us-00022-AC-3.1** (us-00022-FR-3)
  Given Compare is open
  When the Modeler interacts with either board
  Then no node is draggable and the live model's export is byte-identical to before
  Compare was opened
- **us-00022-AC-4.1** (us-00022-FR-4)
  Given a live board and Compare open
  When the Modeler closes Compare
  Then the live board's nodes, edges, order, and contexts are unchanged
- **us-00022-AC-5.1** (us-00022-FR-5)
  Given only one snapshot exists
  When the Modeler opens the versions list
  Then Compare is unavailable

## Links

- Spec: spec-00008-model-versioning-compare · Design: design-00008-versioning-compare-surface · Plan: plan-00015-model-versioning-compare
