---
id: us-00009-concurrent-events
type: us
role: main
status: active
parent: spec-00001-mvp-editor
---

# User Story: concurrent (parallel) events

As a Modeler,
I want concurrent events shown side by side in parallel,
so that the model reflects things that happen at the same time.

## Requirements (EARS)

- **us-00009-FR-1** (Event) When two Domain Events in a context share the same
  timeline order, the system shall place them in the same column, stacked in
  parallel sub-lanes, with each event's slice inheriting its lane.

> Fan-out (one event triggering several policies) is already covered by the
> graph model (us-00002).

## Acceptance (GWT)

- **us-00009-AC-1.1** (us-00009-FR-1)
  Given two Domain Events in a context with the same order
  When the board is laid out
  Then they share the same timeline column
  And they occupy different parallel lanes

## Links
- Spec: spec-00001-mvp-editor · Design: design-00002-structured-board §9 · Plan: plan-00002-structured-board
