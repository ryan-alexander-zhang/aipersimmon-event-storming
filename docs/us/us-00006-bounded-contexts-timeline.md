---
id: us-00006-bounded-contexts-timeline
type: us
role: main
status: active
parent: spec-00001-mvp-editor
---

# User Story: bounded contexts along a timeline

As a Modeler,
I want to organize the board into bounded contexts along an ordered timeline,
so that the model reads as distinct process areas in causal order.

## Requirements (EARS)

- **us-00006-FR-1** (Event) When the Modeler creates a bounded context, the
  system shall add it as an ordered column group on the board.
- **us-00006-FR-2** (Event) When the Modeler adds a Domain Event to a context,
  the system shall place it at the next timeline position within that context.
- **us-00006-FR-3** (Event) When the Modeler reorders events within a context or
  reorders contexts, the system shall recompute the timeline order and the
  layout.
- **us-00006-FR-4** (Event) When the Modeler reassigns an element to another
  context, the system shall move it into that context's column group.

## Acceptance (GWT)

- **us-00006-AC-1.1** (us-00006-FR-1, us-00006-FR-2)
  Given a board with one context
  When the Modeler adds a second context and a Domain Event in it
  Then a new column group appears after the first
  And the event sits in that group's Domain Events band
- **us-00006-AC-3.1** (us-00006-FR-3)
  Given two Domain Events in a context
  When the Modeler reorders them
  Then their timeline columns swap accordingly
- **us-00006-AC-4.1** (us-00006-FR-4)
  Given an element in context A
  When the Modeler reassigns it to context B
  Then it renders within context B's column group

## Links
- Spec: spec-00001-mvp-editor · Design: design-00002-structured-board · Plan: plan-00002-structured-board
