---
id: us-00017-converge-to-structured-board
type: us
role: main
status: active
parent: spec-00002-discovery-mode
---

# User Story: converge discovered events into the structured board

As a Modeler,
I want one deliberate action that turns my discovery wall into ordered
structured-board events,
so that after diverging I can formalize the timeline and continue with the full
Event Storming grammar.

## Requirements (EARS)

- **us-00017-FR-1** (Event) When the Modeler triggers Converge, the system shall
  create one structured-board Domain Event per discovery event and then clear the
  discovery wall and leave Discovery Mode.
- **us-00017-FR-2** (Event) When converging, the system shall assign each new
  Domain Event a global timeline `order` derived from the discovery events'
  **left→right (x) position**, so left-most becomes earliest.
- **us-00017-FR-3** (Event) When converging, the system shall leave every new
  Domain Event **Ungrouped** (no bounded context); context is assigned later on
  the structured board.
- **us-00017-FR-4** (Ubiquitous) The system shall make a converged event
  indistinguishable from a normally-added Domain Event: it carries a global order,
  is laid out by the layout engine, and carries **no free coordinates**.
- **us-00017-FR-5** (Unwanted) If Converge runs with an empty discovery wall, then
  the system shall make no change to the model and simply leave Discovery Mode.

## Acceptance (GWT)

- **us-00017-AC-1.1** (us-00017-FR-1)
  Given a discovery wall of three events and Discovery Mode active
  When the Modeler triggers Converge
  Then the structured model gains three Domain Events, the discovery wall is empty,
  and Discovery Mode is off
- **us-00017-AC-2.1** (us-00017-FR-2)
  Given discovery events laid out left→right as C (x=300), A (x=50), B (x=150)
  When the Modeler converges
  Then the resulting timeline order is A, B, C
- **us-00017-AC-2.2** (us-00017-FR-2)
  Given the structured board already has events ending at order N
  When a discovery wall is converged
  Then the new events take the next contiguous global orders after N in their
  left→right sequence
- **us-00017-AC-3.1** (us-00017-FR-3)
  Given a discovery wall of events
  When the Modeler converges
  Then every new Domain Event is Ungrouped
- **us-00017-AC-4.1** (us-00017-FR-4)
  Given a converged Domain Event
  When the model is exported to DSL
  Then it appears with a global `order` and no position field, identical in shape
  to a normally-added event
- **us-00017-AC-5.1** (us-00017-FR-5)
  Given Discovery Mode is active with an empty wall
  When the Modeler triggers Converge
  Then the model is unchanged and Discovery Mode is off

## Links

- Spec: spec-00002-discovery-mode · Decision: decision-00004 · Plan: plan-00012-discovery-mode
