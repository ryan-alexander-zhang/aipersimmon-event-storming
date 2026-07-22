---
id: us-00014-narrative-walkthrough
type: us
role: main
status: active
parent: spec-00005-narrative-walkthrough
---

# User Story: narrative walkthrough

As a Modeler,
I want to step through the Domain Event timeline forward and backward,
so that I can validate a complex flow by telling its story.

## Requirements (EARS)

- **us-00014-FR-1** (Event) When the Modeler starts a walkthrough, the system
  shall select the first Domain Event in timeline order and highlight its slice
  (dimming the rest of the board).
- **us-00014-FR-2** (Event) When the Modeler steps forward or backward, the system
  shall move to the next or previous Domain Event in timeline order and highlight
  its slice.
- **us-00014-FR-3** (Unwanted) If the Modeler steps backward from the first event
  or forward from the last, then the system shall stay on the current end (clamp),
  neither wrapping nor erroring.
- **us-00014-FR-4** (State) While a walkthrough is active, the system shall not
  mutate the model.
- **us-00014-FR-5** (Event) When the Modeler exits the walkthrough, the system
  shall return to normal editing with the model unchanged.

## Acceptance (GWT)

- **us-00014-AC-1.1** (us-00014-FR-1)
  Given a board with ordered Domain Events
  When the Modeler starts a walkthrough
  Then the first event is selected and its slice is highlighted
- **us-00014-AC-2.1** (us-00014-FR-2)
  Given an active walkthrough on the first event
  When the Modeler steps forward then backward
  Then it moves to the second event and back to the first
- **us-00014-AC-3.1** (us-00014-FR-3)
  Given an active walkthrough on the last event
  When the Modeler steps forward
  Then it stays on the last event
- **us-00014-AC-4.1** (us-00014-FR-4)
  Given an active walkthrough
  When the Modeler presses a timeline arrow key
  Then no event's order changes
- **us-00014-AC-5.1** (us-00014-FR-5)
  Given an active walkthrough
  When the Modeler exits
  Then editing resumes and the model is unchanged

## Links

- Spec: spec-00005-narrative-walkthrough · Plan: plan-00010-narrative-walkthrough
