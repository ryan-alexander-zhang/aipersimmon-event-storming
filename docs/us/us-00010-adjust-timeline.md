---
id: us-00010-adjust-timeline
type: us
role: main
status: active
parent: spec-00001-mvp-editor
---

# User Story: adjust the timeline by direct manipulation

As a Modeler,
I want to adjust a Domain Event's place on the timeline after it is added — by
dragging it, making it concurrent with another, splitting it back out, or
sending it to the start/end,
so that I can fix an ordering mistake without deleting and rebuilding the slice.

Scope: within a single Bounded Context. Moving an event to another context is
out of scope here (deferred; see us-00006-FR-4 for context reassignment). Only
Domain Events are draggable — they carry the timeline order; every other element
follows its event's column automatically (us-00007), so no other node moves.
This realizes the "drag events to change order" interaction promised in
design-00002 §5, and lets the Modeler form and dismantle the concurrency state
of us-00009 by hand.

## Requirements (EARS)

- **us-00010-FR-1** (Event) When the Modeler drags a Domain Event and drops it in
  the gap between two timeline columns — or before the first or after the last —
  within its context, the system shall give it a new order at that position and
  recompute the layout, shifting the other events accordingly.
- **us-00010-FR-2** (Event) When the Modeler drops a dragged Domain Event onto an
  existing timeline column, the system shall make it concurrent with that
  column's events (share their order) and place it in a parallel sub-lane.
- **us-00010-FR-3** (Event) When the Modeler drags a Domain Event that shares a
  column with others (a concurrency group) out to a gap, the system shall split
  it into its own timeline column.
- **us-00010-FR-4** (Event) When the Modeler invokes "move to start" or "move to
  end" on a selected Domain Event, the system shall place it before the first or
  after the last column in its context.
- **us-00010-FR-5** (State) While a Domain Event is selected, when the Modeler
  presses the Left or Right arrow, the system shall move it one timeline column
  toward the start or end within its context.
- **us-00010-FR-6** (State) While a Domain Event is being dragged, the system
  shall show the pending drop target — an insertion indicator between columns, or
  a highlight on the target column for a concurrency drop — before commit.
- **us-00010-FR-7** (Unwanted) If a drag is cancelled or ends outside the event's
  own context, then the system shall leave the order unchanged and restore the
  event's computed position.
- **us-00010-FR-8** (Ubiquitous) The system shall leave no empty timeline column
  between events after an adjustment.

## Acceptance (GWT)

- **us-00010-AC-1.1** (us-00010-FR-1)
  Given three Domain Events A, B, C in that timeline order in one context
  When the Modeler drags C into the gap between A and B
  Then the timeline order becomes A, C, B
  And the columns to the right shift accordingly
- **us-00010-AC-1.2** (us-00010-FR-1)
  Given Domain Events A, B, C in that order
  When the Modeler drops A after the last column
  Then the timeline order becomes B, C, A
- **us-00010-AC-2.1** (us-00010-FR-2)
  Given Domain Events A and B in adjacent columns
  When the Modeler drops B onto A's column
  Then A and B share one timeline column
  And they occupy different parallel sub-lanes
- **us-00010-AC-3.1** (us-00010-FR-3)
  Given Domain Events A and B concurrent in one column
  When the Modeler drags B into the gap after that column
  Then B occupies its own column immediately after A
  And A no longer shares its column
- **us-00010-AC-4.1** (us-00010-FR-4)
  Given Domain Events A, B, C in that order
  When the Modeler invokes "move to start" on C
  Then the timeline order becomes C, A, B
- **us-00010-AC-5.1** (us-00010-FR-5)
  Given Domain Events A, B, C in that order with B selected
  When the Modeler presses the Left arrow
  Then the timeline order becomes B, A, C
- **us-00010-AC-6.1** (us-00010-FR-6)
  Given a Domain Event being dragged
  When the pointer is over a gap between columns versus over a column's center
  Then the system shows an insertion indicator in the first case
  And a column highlight in the second
- **us-00010-AC-7.1** (us-00010-FR-7)
  Given a Domain Event being dragged
  When the Modeler cancels the drag (Escape) or drops outside the context
  Then the timeline order is unchanged
  And the event returns to its computed position
- **us-00010-AC-8.1** (us-00010-FR-8)
  Given a context whose event orders have a gap (e.g. after a deletion)
  When any timeline adjustment runs
  Then the resulting columns are contiguous with no empty column between events

## Links
- Spec: spec-00001-mvp-editor · Design: design-00004-timeline-editing · Plan: plan-00007-timeline-editing
- Related: us-00006-FR-3 (reorder → recompute), us-00009 (concurrent events layout), design-00002 §5/§9
