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

| Story | Doc | Status | Summary |
| --- | --- | --- | --- |
| US1 | [us-00001-place-elements](../us/us-00001-place-elements.md) | draft | Place typed elements on the canvas and edit them |
| US2 | [us-00002-connect-elements](../us/us-00002-connect-elements.md) | draft | Connect elements with valid semantic relations |
| US3 | [us-00003-annotate-hotspots](../us/us-00003-annotate-hotspots.md) | draft | Attach hotspots to any element |
| US4 | [us-00004-export-import](../us/us-00004-export-import.md) | draft | Export/import the model as JSON, losslessly |
| US5 | [us-00005-local-persistence](../us/us-00005-local-persistence.md) | draft | Autosave locally and restore on reload |

## 3. Cross-cutting / System Requirements

- **spec-00001-XFR-1** (Ubiquitous) The system shall keep all model data in the
  browser and shall not send it over the network.
- **spec-00001-XFR-2** (Unwanted) If imported JSON does not satisfy the DSL
  schema, then the system shall reject it with a readable error and leave the
  current model unchanged.
- **spec-00001-XFR-3** (Ubiquitous) The system shall stamp the DSL `version` on
  export and reject an unknown future `version` on import.

**Acceptance (GWT)**
- **spec-00001-XAC-2.1** (spec-00001-XFR-2)
  Given a malformed or schema-invalid JSON file
  When the Modeler imports it
  Then the system shows an error and the current model is unchanged
- **spec-00001-XAC-1.1** (spec-00001-XFR-1)
  Given a model with elements
  When the Modeler uses the app
  Then no network request carries the model data

## 4. Technical Design

Linked design: [design-00001-editor-model-and-architecture](../design/design-00001-editor-model-and-architecture.md)
(model as uniform nodes+edges, connection-rule table, Zod DSL as source of truth,
data flow, `web/` layout).

### 4.1 State
Client-only Zustand store holds `nodes`, `edges`, `selection`. React Flow is the
controlled canvas. No server, no routes.

### 4.2 Data
The DSL `Model` (`meta`, `nodes[]`, `edges[]`) is the only persisted shape:
exported as a JSON file and autosaved to localStorage.

### 4.3 Error Handling (each row maps to a requirement id)
| Error | Handling | Requirement |
| --- | --- | --- |
| invalid connection attempt | reject, show non-blocking feedback | us-00002-FR-2 |
| malformed/invalid import | reject, keep current model, show error | spec-00001-XFR-2 / spec-00001-XAC-2.1 |
| unknown DSL version on import | reject with version message | spec-00001-XFR-3 |
| corrupt localStorage on load | start empty, do not crash | us-00005-FR-2 |

## 5. Out of Scope

Collaboration, auth, backend, other Event Storming levels, non-JSON export,
template libraries (see the PRD and the idea roadmap).

## 6. Non-Functional

- Client-only static build (`next build`), deployable to any static host.
- Elements distinguishable by label/icon, not color alone (accessibility).

## Links
- Design: design-00001-editor-model-and-architecture
- Plan: plan-00001-mvp-editor · Analysis: analysis-00001-tech-stack-and-tooling
