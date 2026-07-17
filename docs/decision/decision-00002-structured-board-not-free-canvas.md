---
id: decision-00002-structured-board-not-free-canvas
type: decision
role: main
status: active
parent: spec-00001-mvp-editor
---

# Event Storming is a deterministic structured board, not a free canvas

## Context

The first implementation (plan-00001) rendered a free React Flow whiteboard:
users dragged stickies anywhere. Review verdict: **unreadable**. Event Storming
is not a free-form whiteboard — it has a canonical, fixed structure. Letting
users position elements freely guarantees a mess.

Event Storming's structure (confirmed with reference images and the grammar
below): a **timeline of Domain Events is the spine**; every other element exists
to serve an event. Elements live in **fixed type-bands** (rows) and along a
**timeline** (columns) grouped by **bounded context**.

Grammar:

```
Actor → issues → Command → actsOn → Aggregate → produces → Domain Event
Domain Event → triggers → Policy → issues → Command
Domain Event → updates → Read Model → informs → Actor
External System ↔ Command / Domain Event / Policy
```

## Decision

Rebuild the editor as a **deterministic structured board**. The user edits the
**model**; the tool **computes the layout**. Confirmed choices:

1. **Layout is derived, never dragged.** Position = f(type → row-band, bounded
   context + timeline order → column). Connectors are auto-routed from the
   causal links.
2. **Type-bands (rows), fixed order**: Actors/Systems · Commands · Aggregates ·
   Domain Events · Policies · Read Models · Hot Spots.
3. **Bounded contexts are first-class** — column groups along the timeline.
4. **Primary interaction = slice builder.** Work from the Domain Event timeline;
   selecting/adding an event lets the user attach its slice (Command, Actor,
   Aggregate, Policy, Read Model, Hotspot) via contextual actions; each element
   drops into its band automatically.
5. **Layout control = fully automatic + timeline reorder / context reassignment
   only.** No free positioning.

## Consequences

- Supersedes [design-00001](../design/design-00001-editor-model-and-architecture.md)
  (free-canvas model) → archived; replaced by design-00002.
- DSL v2: add bounded contexts and timeline order; positions become **derived**
  (dropped from the stored model); add the `updates` relation (Domain Event →
  Read Model) and external-system relations.
- React Flow is kept as the renderer with `nodesDraggable=false` plus a custom
  banded auto-layout engine. DSL schema, store, serialization, and custom node
  components are largely reused.
- Existing `us-00001` (place) and `us-00002` (connect) are re-scoped to the
  slice-builder model; new stories cover bounded contexts + timeline and
  structured editing.
- New work is tracked under plan-00002; plan-00001 stays `resolved` as history.
