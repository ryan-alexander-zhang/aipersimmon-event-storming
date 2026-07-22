---
id: us-00013-opportunity-element
type: us
role: main
status: active
parent: spec-00003-hotspot-workflow-opportunity
---

# User Story: opportunity element

As a Modeler,
I want to attach Opportunities to elements,
so that I can capture ideas and value to pursue, not only risks.

## Requirements (EARS)

- **us-00013-FR-1** (Event) When the Modeler adds an Opportunity attached to an
  element, the system shall create an `opportunity` node linked to that element by
  a `highlights` edge.
- **us-00013-FR-2** (Event) When the Modeler edits an Opportunity's text, the
  system shall update the opportunity node in the model.
- **us-00013-FR-3** (Ubiquitous) The system shall render an Opportunity in its
  conventional colour and band — distinct from a Hotspot — at every level.
- **us-00013-FR-4** (Unwanted) If the Modeler attempts to connect an Opportunity
  with a relation the grammar does not allow, then the system shall reject the
  connection.

## Acceptance (GWT)

- **us-00013-AC-1.1** (us-00013-FR-1)
  Given any element on the board
  When the Modeler adds an Opportunity to it
  Then an opportunity node exists
  And a `highlights` edge links the opportunity to that element
- **us-00013-AC-2.1** (us-00013-FR-2)
  Given an opportunity node
  When the Modeler edits its text
  Then the opportunity shows the new text
  And the model holds it
- **us-00013-AC-3.1** (us-00013-FR-3)
  Given the board at Big Picture level
  When an Opportunity is present
  Then it renders in its own colour/band, visually distinct from a Hotspot
- **us-00013-AC-4.1** (us-00013-FR-4)
  Given an Opportunity
  When a connection to a target the grammar forbids is attempted
  Then the connection is rejected

## Links

- Spec: spec-00003-hotspot-workflow-opportunity · Plan: plan-00009-hotspot-workflow-opportunity
