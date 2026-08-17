---
id: spec-00001-mvp-editor
type: spec
role: main
status: active
parent: prd-00001-event-storming-tool
---

# Spec: Event Storming editor with JSON DSL export

> The coherent, shippable capability: a single-user, browser-local Process-Level
> Event Storming editor whose model exports/imports as a validated JSON DSL.

## 1. Context

Canonical terms from [CONTEXT.md](../../CONTEXT.md): Domain Event, Command, Actor,
Aggregate, Policy, Read Model, External System, Hotspot, Pivotal Event, and the
semantic relations (issues, handledBy, emits, triggers, invokes, informs,
annotates); Model and DSL. Inputs:
[prd-00001](../prd/prd-00001-event-storming-tool.md),
[analysis-00001](../analysis/analysis-00001-tech-stack-and-tooling.md).

## 2. User Stories

> Re-scoped by [decision-00002](../decision/decision-00002-structured-board-not-free-canvas.md):
> the board is a deterministic structured layout (bands × bounded-context ×
> timeline), edited via a slice builder — not a free canvas. US1/US2 semantics
> shift accordingly; US6/US7 are new.

| Story | Doc | Status | Summary |
| --- | --- | --- | --- |
| US1 | [us-00001-place-elements](../us/us-00001-place-elements.md) | active | Add typed elements into their band via the slice builder (auto-placed) |
| US2 | [us-00002-connect-elements](../us/us-00002-connect-elements.md) | active | Relations follow the grammar; slice actions auto-link, manual links validated |
| US3 | [us-00003-annotate-hotspots](../us/us-00003-annotate-hotspots.md) | active | Attach hotspots to any element |
| US4 | [us-00004-export-import](../us/us-00004-export-import.md) | active | Export/import the model (DSL v2: contexts + timeline order) losslessly |
| US5 | [us-00005-local-persistence](../us/us-00005-local-persistence.md) | archived | Autosave locally and restore on reload — superseded by [us-00032](../us/us-00032-project-scoped-local-save.md) (spec-00012), which scopes it to a Project |
| US6 | [us-00006-bounded-contexts-timeline](../us/us-00006-bounded-contexts-timeline.md) | active | Organize the board into bounded contexts along an ordered timeline |
| US7 | [us-00007-structured-slice-editing](../us/us-00007-structured-slice-editing.md) | active | Build event slices; layout is computed, positions never hand-set |
| US8 | [us-00008-levels](../us/us-00008-levels.md) | active | Switch Big Picture / Process / Design levels (view filter over one model) |
| US9 | [us-00009-concurrent-events](../us/us-00009-concurrent-events.md) | active | Show concurrent events in parallel sub-lanes at one timeline slot |
| US10 | [us-00010-adjust-timeline](../us/us-00010-adjust-timeline.md) | active | Adjust the timeline by direct manipulation: drag/reorder, make concurrent, split, move to ends |

## 3. Cross-cutting / System Requirements

- **spec-00001-XFR-1** (Ubiquitous) The system shall keep all model data in the
  browser and shall not send it over the network.
- **spec-00001-XFR-2** (Unwanted) If imported JSON does not satisfy the DSL
  schema, then the system shall reject it with a readable error and leave the
  current model unchanged.
- **spec-00001-XFR-3** (Ubiquitous) The system shall stamp the DSL `version` on
  export and reject an unknown future `version` on import.
- **spec-00001-XFR-4** (Ubiquitous) The system shall derive every element's
  position from its type (row-band), bounded context, and timeline order; the
  user shall not set positions freely.
- **spec-00001-XFR-5** (Ubiquitous) The system shall place each element type in
  its fixed row-band and each bounded context in its own timeline column group.

**Acceptance (GWT)**
- **spec-00001-XAC-2.1** (spec-00001-XFR-2)
  Given a malformed or schema-invalid JSON file
  When the Modeler imports it
  Then the system shows an error and the current model is unchanged
- **spec-00001-XAC-1.1** (spec-00001-XFR-1)
  Given a model with elements
  When the Modeler uses the app
  Then no network request carries the model data
- **spec-00001-XAC-4.1** (spec-00001-XFR-4, spec-00001-XFR-5)
  Given two elements of the same type in the same context
  When they are added
  Then both sit in that type's row-band
  And the same model always yields the same computed layout

## 4. Technical Design

Linked design: [design-00002-structured-board](../design/design-00002-structured-board.md)
(band × bounded-context × timeline layout engine, DSL v2 with contexts + order +
derived positions, the `updates` relation, and the slice-builder interaction).
Supersedes design-00001 (free canvas, archived).

### 4.1 State
Client-only Zustand store holds `nodes`, `edges`, `selection`. React Flow is the
controlled canvas. No server, no routes.

### 4.2 Data
The DSL `Model` (`meta`, `nodes[]`, `edges[]`) is the only persisted shape:
exported as a JSON file and autosaved locally — to localStorage here, on the
active Project in IndexedDB since [spec-00012](./spec-00012-project-workspace.md).

### 4.3 Error Handling (each row maps to a requirement id)
| Error | Handling | Requirement |
| --- | --- | --- |
| invalid connection attempt | reject, show non-blocking feedback | us-00002-FR-2 |
| malformed/invalid import | reject, keep current model, show error | spec-00001-XFR-2 / spec-00001-XAC-2.1 |
| unknown DSL version on import | reject with version message | spec-00001-XFR-3 |
| corrupt stored model on load | start empty, do not crash | us-00005-FR-2 → us-00032-FR-3 |

## 5. Out of Scope

Collaboration, auth, backend, other Event Storming levels, non-JSON export,
template libraries (see the PRD and the idea roadmap).

## 6. Non-Functional

- Client-only static build (`next build`), deployable to any static host.
- Elements distinguishable by label/icon, not color alone (accessibility).

## Links
- Design: design-00001-editor-model-and-architecture
- Plan: plan-00001-mvp-editor · Analysis: analysis-00001-tech-stack-and-tooling
