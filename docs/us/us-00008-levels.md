---
id: us-00008-levels
type: us
role: main
status: active
parent: spec-00001-mvp-editor
---

# User Story: Event Storming levels

As a Modeler,
I want to switch between Big Picture, Process, and Design levels,
so that I can focus on the right abstraction without losing detail.

## Requirements (EARS)

- **us-00008-FR-1** (Event) When the Modeler selects a level, the system shall
  show only that level's element types — and their bands and slice actions —
  and hide the rest, without deleting anything.
- **us-00008-FR-2** (Ubiquitous) The system shall persist the current level in
  the model (`meta.level`) and restore it on load.

## Acceptance (GWT)

- **us-00008-AC-1.1** (us-00008-FR-1)
  Given a model containing every element type
  When the Modeler selects Big Picture
  Then only Actors/Systems, Domain Events, and Hot Spots are shown
  And Commands, Constraints, Aggregates, Policies, and Read Models are hidden
- **us-00008-AC-1.2** (us-00008-FR-1)
  Given a selected Command
  When the Modeler is at Design
  Then `+ Constraint (constrains)` and `+ Aggregate (handled by)` are offered
  And switching to Process hides both (they are Design-only)
- **us-00008-AC-2.1** (us-00008-FR-2)
  Given a level is set
  When the model is exported and re-imported
  Then the level is restored

## Links
- Spec: spec-00001-mvp-editor · Design: design-00002-structured-board §8 · Plan: plan-00002-structured-board
