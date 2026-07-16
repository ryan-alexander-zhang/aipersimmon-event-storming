---
id: us-00002-connect-elements
type: us
role: main
status: active
parent: spec-00001-mvp-editor
---

# User Story: connect elements with semantic relations

As a Modeler,
I want to connect elements with semantic relations that follow the Event
Storming grammar,
so that the model captures causal flow, not just lines.

## Requirements (EARS)

- **us-00002-FR-1** (Event) When the Modeler connects two elements whose types
  match a rule in the connection-rule table, the system shall create an edge
  carrying that relation and show its relation label.
- **us-00002-FR-2** (Unwanted) If the Modeler attempts a connection that matches
  no rule, then the system shall reject it and give non-blocking feedback,
  creating no edge.

## Acceptance (GWT)

- **us-00002-AC-1.1** (us-00002-FR-1)
  Given an Actor and a Command on the canvas
  When the Modeler connects Actor → Command
  Then an edge with relation `issues` is created
  And the edge shows the "issues" label
- **us-00002-AC-2.1** (us-00002-FR-2)
  Given an Actor and a Domain Event on the canvas
  When the Modeler attempts to connect Actor → Domain Event
  Then no edge is created
  And the system indicates the connection is not allowed

## Links
- Spec: spec-00001-mvp-editor · Plan: plan-00001-mvp-editor
