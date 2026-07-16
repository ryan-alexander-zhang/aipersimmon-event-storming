---
id: prd-00001-event-storming-tool
type: prd
role: main
status: active
parent: idea-00001-visual-event-storming-web-tool
---

# PRD: Event Storming visual tool

## Summary

A single-user, browser-only web tool for doing Event Storming (Process Level) on
an infinite canvas and exporting the result as a structured, validated JSON DSL.

## Vision & Goals

Teams and individuals do Event Storming on physical walls or generic whiteboards
and end up with images or free-form stickies — not machine-readable, not
versionable, hard to feed into engineering. This tool keeps the sticky-wall feel
but produces a **structured, validated, diffable model**.

Goals:
- Let one person build a Process-Level Event Storming model visually.
- Preserve domain **semantics** (element types, color conventions, causal
  relations), not just shapes.
- Export/import a **JSON DSL** that round-trips losslessly.
- Zero setup: runs in the browser, no account, no backend.

Non-goals (first version): real-time collaboration, accounts, a server/database,
Big Picture and Software Design levels, non-JSON export formats.

## Actors

- **Modeler** (the only user): a DDD practitioner, architect, product/tech lead,
  or learner building and editing a model.

## Scope

**In scope**: infinite canvas; the Process-Level element set (Domain Event,
Command, Actor, Aggregate, Policy, Read Model, External System, Hotspot; Pivotal
as a flag); semantic connections with validity rules; per-element editing;
JSON DSL export/import; browser-local autosave.

**Out of scope**: collaboration/multi-user, auth, backend persistence, other
Event Storming levels, PlantUML/Mermaid/AsyncAPI/image export (roadmap), template
libraries.

## Functional Requirements (what the product must do)

1. Place typed Event Storming elements on the canvas, each with its conventional
   color and an editable label/description.
2. Connect elements with semantic relations that follow the Event Storming
   grammar; block connections that violate it.
3. Mark the most significant Domain Events as Pivotal.
4. Attach Hotspots (conflicts/questions/risks) to any element.
5. Export the whole model to a JSON file and import it back without loss.
6. Autosave locally so work survives a page reload.

## User Experience Expectations

- Drag elements from a color-coded palette onto the canvas; pan/zoom/select feel
  immediate.
- Invalid connections give clear, non-blocking feedback rather than silent
  failure.
- Colors follow the ddd-crew convention; elements are also distinguishable by
  label/icon (not color alone).
- Export/import is one click; a reload never loses the current model.

## Risks & Dependencies

- **Connection-rule design**: too strict frustrates users, too loose loses
  semantics — needs a clear, testable rule set.
- **DSL evolution**: the schema must version so older files stay readable.
- **Client-only trust boundary**: imported JSON is untrusted and must be
  validated before use.
- Dependencies: React Flow (canvas), Zod (schema), Zustand (state); see
  [analysis-00001](../analysis/analysis-00001-tech-stack-and-tooling.md).
