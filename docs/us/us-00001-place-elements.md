---
id: us-00001-place-elements
type: us
role: main
status: active
parent: spec-00001-mvp-editor
---

# User Story: add and edit elements

> Re-scoped by [decision-00002](../decision/decision-00002-structured-board-not-free-canvas.md):
> elements are added into their fixed row-band (via the slice builder, see
> us-00007), not free-dropped at a cursor position.

As a Modeler,
I want to add typed Event Storming elements and edit them,
so that I can build the model with the correct domain semantics.

## Requirements (EARS)

- **us-00001-FR-1** (Event) When the Modeler adds an element of a given type, the
  system shall create a node of that type in the type's row-band, in the type's
  conventional color.
- **us-00001-FR-2** (Event) When the Modeler edits a node's label or description,
  the system shall update the node in the model.
- **us-00001-FR-3** (Event) When the Modeler marks a Domain Event as Pivotal, the
  system shall set the `pivotal` flag and show its Pivotal marker.
- **us-00001-FR-4** (Event) When the Modeler deletes a selected node, the system
  shall remove the node and any edges attached to it.

## Acceptance (GWT)

- **us-00001-AC-1.1** (us-00001-FR-1)
  Given an empty board
  When the Modeler adds a "Domain Event"
  Then a domainEvent node appears in the Domain Events band with the orange color
  And it exists in the model
- **us-00001-AC-2.1** (us-00001-FR-2)
  Given a node on the canvas
  When the Modeler edits its label
  Then the node shows the new label
  And the model holds the new label
- **us-00001-AC-3.1** (us-00001-FR-3)
  Given a Domain Event node
  When the Modeler marks it Pivotal
  Then the node shows the Pivotal marker
  And its `pivotal` flag is set in the model
- **us-00001-AC-4.1** (us-00001-FR-4)
  Given a node with a connected edge
  When the Modeler deletes the node
  Then the node and that edge are removed from the model

## Links
- Spec: spec-00001-mvp-editor · Plan: plan-00001-mvp-editor
