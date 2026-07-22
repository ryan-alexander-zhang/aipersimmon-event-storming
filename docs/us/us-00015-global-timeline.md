---
id: us-00015-global-timeline
type: us
role: main
status: active
parent: spec-00009-global-timeline-bounded-context-region
---

# User Story: one global timeline

As a Modeler,
I want all Domain Events on a single shared timeline with Bounded Context shown
as a region,
so that I can order events across the whole business — including interleaving
different contexts — the way Event Storming intends.

## Requirements (EARS)

- **us-00015-FR-1** (Ubiquitous) The system shall order Domain Events on a single
  global timeline; any event may occupy any global position regardless of its
  Bounded Context.
- **us-00015-FR-2** (Event) When events are created or reordered, the system shall
  keep the board's left→right order equal to the walkthrough order (both derive
  from the one global order).
- **us-00015-FR-3** (Ubiquitous) The system shall render a Bounded Context as a
  colour/region overlay over the shared timeline — not a separate column block —
  and contexts may overlap in time.
- **us-00015-FR-4** (State) While two Domain Events share a global position, the
  system shall treat them as concurrent (one column, parallel sub-lanes), even
  across contexts.
- **us-00015-FR-5** (Unwanted) If a pre-spec per-context DSL file is imported,
  then the system shall assign a deterministic global order and load it without
  loss.

## Acceptance (GWT)

- **us-00015-AC-1.1** (us-00015-FR-1)
  Given contexts Ordering `[A, C]` and Payment `[B]` where chronologically A < B < C
  When the events are placed on the timeline
  Then the global order is A, B, C (B sits between A and C)
- **us-00015-AC-2.1** (us-00015-FR-2)
  Given a model with two or more contexts
  When the board is laid out
  Then the left→right order of events equals `timelineOrder`
- **us-00015-AC-3.1** (us-00015-FR-3)
  Given events belonging to two contexts interleaved in time
  When the board renders
  Then each context reads as a region/colour over the shared timeline, not as a
  separate column block
- **us-00015-AC-4.1** (us-00015-FR-4)
  Given two events of different contexts at the same global order
  When the board renders
  Then they share one column as concurrent events
- **us-00015-AC-5.1** (us-00015-FR-5)
  Given a pre-spec file with per-context orders
  When it is imported
  Then every event has a global order and nothing is lost

## Links

- Spec: spec-00009-global-timeline-bounded-context-region · Plan: plan-00011-global-timeline
