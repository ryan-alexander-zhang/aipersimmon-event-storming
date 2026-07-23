---
id: us-00023-compare-diff-view
type: us
role: main
status: active
parent: spec-00008-model-versioning-compare
---

# User Story: see what changed between two snapshots as a unified diff

As a Modeler,
I want to compare two snapshots as a single diff board that highlights what was
added, changed, or removed,
so that I can see at a glance how the model evolved (e.g. as-is → to-be) instead of
eyeballing two look-alike boards.

> Supersedes [us-00022](../us/us-00022-compare-snapshots.md) (side-by-side) per
> [decision-00009](../decision/decision-00009-compare-as-unified-diff.md).

## Requirements (EARS)

- **us-00023-FR-1** (Event) When the Modeler picks a base and a target snapshot and
  opens Compare, the system shall render a single diff board — the target model laid
  out — with unchanged elements de-emphasized, added elements marked added, and
  changed elements marked changed.
- **us-00023-FR-2** (Event) When the diff is shown, the system shall list elements
  present in the base but absent from the target as removed, and show a summary count
  of added / removed / changed.
- **us-00023-FR-3** (Ubiquitous) The system shall compute the diff by stable element
  id: in-target-only = added, in-base-only = removed, in-both-but-differing (label,
  context, timeline order, or properties) = changed, otherwise unchanged.
- **us-00023-FR-4** (Event) When the Modeler changes the base or target snapshot, the
  system shall recompute and re-render the diff.
- **us-00023-FR-5** (State) While the diff is open, the system shall keep the board
  read-only and shall not mutate the live model.
- **us-00023-FR-6** (Event) When the Modeler closes the diff, the system shall return
  to the live board with it unchanged.
- **us-00023-FR-7** (Unwanted) If fewer than two snapshots exist, then the system
  shall not offer Compare.
- **us-00023-FR-8** (Event) When a changed element is shown, the system shall display
  its change on the element: a renamed element shows its previous label
  struck-through, and other changed fields (timeline order, context, pivotal, hotspot
  state/kind/priority, description) show a compact change chip — order as a direction
  (earlier/later), not a raw slot number (decision-00010).
- **us-00023-FR-9** (Event) When the Modeler hovers a changed element, the system
  shall reveal the full field-level detail — each changed field as before → after,
  including resolved context names and the description.

## Acceptance (GWT)

- **us-00023-AC-1.1** (us-00023-FR-1, us-00023-FR-3)
  Given base "as-is" and target "to-be" that adds one Domain Event
  When the Modeler opens Compare
  Then the diff board shows the target's elements with the one added event marked
  added and every carried-over element marked unchanged
- **us-00023-AC-1.2** (us-00023-FR-1, us-00023-FR-3)
  Given a target that renamed one element kept from the base
  When the Modeler opens Compare
  Then that element is marked changed (not added, not removed)
- **us-00023-AC-2.1** (us-00023-FR-2)
  Given a target that dropped one element present in the base
  When the Modeler opens Compare
  Then that element is listed as removed and the summary counts one removal
- **us-00023-AC-3.1** (us-00023-FR-3)
  Given base and target that are identical
  When the Modeler opens Compare
  Then every element is unchanged and the summary is 0 added / 0 removed / 0 changed
- **us-00023-AC-4.1** (us-00023-FR-4)
  Given a diff of as-is → to-be
  When the Modeler swaps the target to a third snapshot
  Then the diff recomputes against the new target
- **us-00023-AC-5.1** (us-00023-FR-5)
  Given a diff is open
  When the Modeler interacts with the board
  Then no element is editable and the live model's export is byte-identical to before
  Compare was opened
- **us-00023-AC-6.1** (us-00023-FR-6)
  Given a live board and a diff open
  When the Modeler closes Compare
  Then the live board's nodes, edges, order, and contexts are unchanged
- **us-00023-AC-7.1** (us-00023-FR-7)
  Given only one snapshot exists
  When the Modeler opens the versions list
  Then Compare is unavailable
- **us-00023-AC-8.1** (us-00023-FR-8)
  Given a target that renamed a kept element from "测试3" to "测试3修改了"
  When the diff is shown
  Then that element shows "测试3修改了" with "测试3" struck-through
- **us-00023-AC-8.2** (us-00023-FR-8)
  Given a target that moved a kept Domain Event later on the timeline
  When the diff is shown
  Then that element shows a "later" direction chip (not a slot number)
- **us-00023-AC-9.1** (us-00023-FR-9)
  Given a changed element whose context was reassigned
  When the Modeler hovers it
  Then the detail lists `context: <old name> → <new name>`

## Links

- Spec: spec-00008-model-versioning-compare · Decisions: decision-00009-compare-as-unified-diff, decision-00010-diff-field-level-detail (FR-8/9) · Designs: design-00009-compare-diff-surface, design-00010-compare-diff-detail (FR-8/9) · Plans: plan-00016-compare-diff-view, plan-00017-compare-diff-detail (FR-8/9) · Supersedes: us-00022-compare-snapshots
