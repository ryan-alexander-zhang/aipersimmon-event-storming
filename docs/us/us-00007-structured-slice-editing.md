---
id: us-00007-structured-slice-editing
type: us
role: main
status: active
parent: spec-00001-mvp-editor
---

# User Story: structured slice editing with computed layout

As a Modeler,
I want to build an event's causal slice with guided actions and let the tool lay
it out,
so that the board stays readable no matter how large the model grows.

## Requirements (EARS)

- **us-00007-FR-1** (Event) When the Modeler uses a slice action on a selected
  element, the system shall create the grammar-correct next element and relation
  for the current level and place it in its row-band within the slice's column.
  The grammar follows decision-00003 — e.g. from a Domain Event: `+ Command
  (produces)`, `+ Policy (triggers)`, `+ Read Model (updates)`; from a Command:
  `+ Actor (issues)`, `+ Domain Event (produces)`, and at Design `+ Constraint
  (constrains)` / `+ Aggregate (handled by)`. Aggregate-first creation is not
  required.
- **us-00007-FR-2** (Event) When the Modeler adds a Read Model to a Domain Event,
  the system shall create a `Domain Event → updates → Read Model` relation.
- **us-00007-FR-3** (Ubiquitous) The system shall compute every element's
  position from the model (type, context, timeline order).
- **us-00007-FR-4** (Unwanted) If the Modeler drags a node to a free position,
  then the system shall not persist a free position; only timeline reorder and
  context reassignment change placement.
- **us-00007-FR-5** (Event) When the Modeler picks an element from the palette,
  the system shall create that element directly as a free (Ungrouped) node,
  offering only the current level's element types (decision-00003) — so an Actor
  is creatable at Big Picture without first creating a Command.

## Acceptance (GWT)

- **us-00007-AC-1.1** (us-00007-FR-1)
  Given a selected Domain Event
  When the Modeler adds a Policy via the slice action
  Then a policy node exists in the Policies band under that event
  And a `triggers` relation links the event to the policy
- **us-00007-AC-1.2** (us-00007-FR-1)
  Given a selected Domain Event
  When the Modeler adds a Command via `+ Command (produces)`
  Then a command node exists and a `produces` relation links it to the event
  And no Aggregate is created
- **us-00007-AC-5.1** (us-00007-FR-5)
  Given the Big Picture level
  When the Modeler picks Actor from the palette
  Then an Actor node is created without any Command
  And the palette does not offer Command or Aggregate
- **us-00007-AC-2.1** (us-00007-FR-2)
  Given a Domain Event
  When the Modeler adds a Read Model to it
  Then the read model sits in the Read Models band
  And a `updates` relation links the event to the read model
- **us-00007-AC-4.1** (us-00007-FR-3, us-00007-FR-4)
  Given any element on the board
  When the Modeler attempts to drag it to an arbitrary spot
  Then its position stays the computed one (no free positioning)

## Links
- Spec: spec-00001-mvp-editor · Design: design-00002-structured-board · Plan: plan-00002-structured-board
