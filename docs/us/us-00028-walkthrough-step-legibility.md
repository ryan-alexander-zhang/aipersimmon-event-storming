---
id: us-00028-walkthrough-step-legibility
type: us
role: main
status: active
parent: spec-00005-narrative-walkthrough
---

# User Story: walkthrough step legibility

As a Modeler,
I want the Walkthrough's current step and my progress along the Timeline to be
unmistakable on the board,
so that I can tell the story without hunting for which Domain Event is current.

Today a step only re-centres the camera and moves the selection, whose whole
visual is a 2px dark outline — unreadable on an orange sticky and identical to an
ordinary click. Nothing marks how far along the Timeline the cursor is except a
10px counter in the overlay.

## Requirements (EARS)

- **us-00028-FR-1** (State) While a Walkthrough is active, the system shall mark
  the Current Step with a **Step Ring** that is visually distinct from the
  selection outline and from the search-hit ring, and shall mark no other element.
- **us-00028-FR-2** (Event) When the Walkthrough cursor moves to another Domain
  Event, the system shall play a one-shot emphasis animation on the newly Current
  Step, and shall not animate where the reader prefers reduced motion.
- **us-00028-FR-3** (State) While a Walkthrough is active, the system shall render
  the **Visited** Domain Events outside the current slice distinctly from both the
  Current Step and the **Upcoming** ones.
- **us-00028-FR-4** (State) While a Walkthrough is active, the overlay shall lead
  with the Current Step's label and show the step position and a progress
  indicator of how far along the Timeline the cursor is.
- **us-00028-FR-5** (Event) When the Modeler presses Left or Right arrow while a
  Walkthrough is active, the system shall step the cursor backward or forward
  without changing any Domain Event's Timeline order.

## Acceptance (GWT)

- **us-00028-AC-1.1** (us-00028-FR-1)
  Given an active Walkthrough on a Domain Event
  When the board is read
  Then that event carries the Step Ring
  And no other Domain Event carries it
- **us-00028-AC-2.1** (us-00028-FR-2)
  Given an active Walkthrough on the first Domain Event
  When the Modeler steps forward
  Then the Step Ring moves to the second event
  And that event runs the one-shot step animation
- **us-00028-AC-3.1** (us-00028-FR-3)
  Given an active Walkthrough on the third of four unconnected Domain Events
  When the board is read
  Then the two Visited events paint a different fill from the Upcoming one
  And both differ from the Current Step's own colour
- **us-00028-AC-4.1** (us-00028-FR-4)
  Given an active Walkthrough on the second of four Domain Events
  When the overlay is read
  Then it shows the event's label, `2 / 4`, and a progress indicator at half width
- **us-00028-AC-5.1** (us-00028-FR-5)
  Given an active Walkthrough on the last Domain Event
  When the Modeler presses Left arrow
  Then the cursor steps to the previous event
  And the board's left→right Domain Event order is unchanged

## Links

- Spec: spec-00005-narrative-walkthrough · Plan: plan-00020-walkthrough-step-legibility
