---
id: us-00029-walkthrough-reading-scope
type: us
role: main
status: active
parent: spec-00005-narrative-walkthrough
---

# User Story: the walkthrough's own reading scope

As a Modeler,
I want the whole Domain Event timeline to stay on screen while the step I am on
shows only its own slice,
so that I keep the global picture of where the story is and still read one slice
without the rest of the board's supporting elements in the way.

The Walkthrough previously had no scope of its own: it dimmed and left everything
rendered, and borrowing Isolate for the focus part broke both
([issue-00031](../issue/issue-00031-a-walkthrough-step-walks-off-the-isolated-board.md)).
The two are separate reading modes; the Walkthrough carries its own scope.

## Requirements (EARS)

- **us-00029-FR-1** (State) While a Walkthrough is active, the system shall keep
  every Domain Event on the board, and shall lay the board out so that the space the
  hidden elements vacated is reclaimed — the Current Step's slice reads as one group
  — while each event's column stays where it was from step to step (issue-00032).
- **us-00029-FR-2** (State) While a Walkthrough is active, the system shall show
  the Current Step's neighbourhood — every element within the Reading Scope's hops
  of it, in either direction — and hide every other element.
- **us-00029-FR-3** (State) While a Walkthrough is active, the system shall render
  the Current Step's neighbourhood vivid and the Domain Events outside it dimmed,
  in the Visited / Current / Upcoming states of us-00028.
- **us-00029-FR-4** (Event) When the Modeler changes the Reading Scope on the
  stepping card, the system shall widen or narrow what is shown around the Current
  Step, between 1 and 3 hops, starting at 1.
- **us-00029-FR-5** (Event) When the Modeler starts a Walkthrough, the system
  shall leave Isolate; and while a Walkthrough is active, Isolate shall not be
  available.

## Acceptance (GWT)

- **us-00029-AC-1.1** (us-00029-FR-1, us-00029-FR-2)
  Given a board of four Domain Events, each with its own Command
  When the Modeler walks to the first event
  Then all four events are on the board
  And the first event's Command is shown
  And the other events' Commands are hidden
- **us-00029-AC-1.2** (us-00029-FR-1)
  Given an active Walkthrough
  When the Modeler steps forward
  Then every Domain Event's column is where it was before the step
- **us-00029-AC-1.3** (us-00029-FR-1)
  Given an active Walkthrough on an event whose Command is bands away on the full
  board
  When the step is read
  Then that Command sits in the step's own column, with the bands nothing occupies
  collapsed
- **us-00029-AC-3.1** (us-00029-FR-3)
  Given an active Walkthrough on the second of four events
  When the board is read
  Then the current event and its Command are vivid
  And the first event paints as Visited and the others as Upcoming
- **us-00029-AC-4.1** (us-00029-FR-4)
  Given an active Walkthrough at Reading Scope 1, with an Actor two hops from the
  Current Step
  When the Modeler sets the Reading Scope to 2
  Then that Actor is shown
- **us-00029-AC-5.1** (us-00029-FR-5)
  Given Isolate active and anchored on an element
  When the Modeler starts a Walkthrough
  Then Isolate is off with no anchor
  And it cannot be switched on until the Walkthrough ends

## Links

- Spec: spec-00005-narrative-walkthrough · Plan: plan-00021-walkthrough-reading-scope ·
  Issue: issue-00031-a-walkthrough-step-walks-off-the-isolated-board
