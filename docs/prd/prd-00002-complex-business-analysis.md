---
id: prd-00002-complex-business-analysis
type: prd
role: main
status: active
parent: idea-00001-visual-event-storming-web-tool
---

# PRD: Event Storming for complex-business analysis (Phase 2)

## Summary

Phase 2 turns the tool from a clean **design-stage modeler** into an instrument
for **exploring and analysing complex business domains**. It keeps the single-user,
browser-only, zero-backend shape of
[prd-00001](./prd-00001-event-storming-tool.md) and adds seven capabilities that
support the *discovery* half of Event Storming: a chaotic-exploration mode, an
actionable hotspot/opportunity workflow, a strategic (subdomain + context-map)
layer, narrative walkthrough, navigation/nesting at scale, model-health analysis,
and model versioning/compare.

Input: [analysis-00002](../analysis/analysis-00002-complex-business-analysis-gaps.md).

## Relationship to prd-00001

prd-00001 remains the **active** source of truth for the shipped MVP editor and
its non-goals *as of Phase 1*. This PRD **revises** three of those non-goals by
bringing them into scope: other Event Storming levels (Big Picture is now an
active working mode, not only a filter), non-JSON considerations for
versioning/compare, and richer annotations. Two non-goals are **explicitly kept**:

- **Real-time collaboration / multi-user / accounts / backend** — still out of
  scope (see analysis-00002 §4). Everything below is single-user and local.
- **Code/diagram export formats** (PlantUML/Mermaid/AsyncAPI/image) — unchanged
  roadmap, not in this PRD.

The chaotic-exploration mode (FR1) conflicts with
[decision-00002](../decision/decision-00002-structured-board-not-free-canvas.md);
that tension is resolved by
[decision-00004](../decision/decision-00004-discovery-mode-free-placement.md).

## Vision & Goals

Complex business is discovered *before* the model is clean. Phase 1 optimised for
a tidy, grammar-correct, auto-laid-out result; that same rigidity blocks the messy
divergence where complexity actually surfaces, and it stops short of the analysis,
triage, and validation loops a team needs to *manage* complexity once surfaced.

Goals:

- Let one modeller **diverge** (dump unordered events, tolerate mess) and then
  **converge** into the structured board — the full Event Storming rhythm.
- Make surfaced uncertainty **actionable**: hotspots and opportunities that can be
  prioritised, assigned, and resolved.
- Bridge to **strategic DDD**: classify subdomains and model context
  relationships, not just visual columns.
- **Validate** flows by telling the story forward/backward.
- **Scale** to hundreds of elements via search/filter/navigation and event-level
  drill-down.
- Surface **model-health** signals from the structured model.
- Support **as-is / to-be** work via snapshots and side-by-side compare.

Non-goals (this phase): collaboration/accounts/backend; non-JSON export; template
libraries; AI assistance.

## Actors

- **Modeller** (unchanged single user): now works across a *discovery* activity
  (diverge, mark, walk the story) and a *design* activity (structured board),
  within one browser-local model.

## Scope

**In scope** — the seven capabilities, each delivered as its own spec:

| # | Capability | Planned spec |
|---|---|---|
| 1 | Discovery mode: free placement of unordered events at Big Picture, then converge into the structured board | spec-00002 |
| 3 | Hotspot workflow (vote / prioritise / assign / resolve) + Opportunity element | spec-00003 |
| 4 | Strategic layer: subdomain classification + bounded-context relationships (context map) | spec-00004 |
| 5 | Narrative walkthrough: step the timeline forward/backward to validate | spec-00005 |
| 6 | Scale: search / filter / minimap navigation + event-level drill-down (nesting) | spec-00006 |
| 7 | Model-health analysis: detect model smells from the structured model | spec-00007 |
| 8 | Model versioning: named snapshots + as-is / to-be side-by-side compare | spec-00008 |

**Out of scope**: real-time collaboration, accounts, backend persistence, code/
diagram export formats, template libraries, AI assistance.

## Functional Requirements

Numbered `prd-00002-FR-<i>`. Each is elaborated into EARS/GWT in its spec's user
stories.

1. **Discovery mode** — At Big Picture level, place unordered Domain Events by free
   positioning with relaxed grammar; provide a **converge** action that assigns
   timeline order + bounded context and hands the slice to the structured board.
   Free positions are never persisted into the structured model or the exported DSL.
2. **Hotspot workflow** — A Hotspot carries a state (open → resolved), an optional
   priority/vote count, and can be promoted to a decision/question; the board can
   filter and count unresolved hotspots.
3. **Opportunity element** — Add an Opportunity element (positive counterpart to
   Hotspot) attachable to any element, with its own colour/band.
4. **Subdomain classification** — Classify each bounded context as core /
   supporting / generic; the classification is visible on the board and stored in
   the DSL.
5. **Context relationships** — Model typed relationships between bounded contexts
   (upstream/downstream, ACL, Conformist, Shared Kernel) and render them as a
   context-map view.
6. **Narrative walkthrough** — Step through the Domain Event timeline forward and
   backward, highlighting the current event's slice, to validate the flow.
7. **Navigation at scale** — Search and filter elements by text / type / context;
   a minimap or outline aids navigation of large boards.
8. **Event drill-down (nesting)** — Drill from a Big Picture Domain Event into a
   nested Process-level board scoped to that event, and back.
9. **Model-health analysis** — Detect and list model smells (orphan events with no
   producing Command, dangling Commands, overloaded Aggregates, Policy cycles,
   unresolved-hotspot counts) as non-blocking findings linking back to elements.
10. **Model versioning** — Capture named snapshots of the model and compare two
    versions (e.g. as-is vs to-be) side by side.

## User Experience Expectations

- Discovery feels like a real wall: drop events fast, unordered, no validation
  nags; converging is one deliberate action, not automatic.
- Hotspots/opportunities are triageable in place; unresolved ones are always
  countable and filterable.
- Strategic view reads as a context map, distinct from the timeline board.
- Walkthrough, search, and drill-down keep pan/zoom immediate on large models.
- Model-health findings are advisory, never block editing.
- Snapshots and compare never mutate the live model unexpectedly.

## Risks & Dependencies

- **Discovery ↔ structured-board boundary** (FR1): the converge hand-off is the
  hard part; positions must not leak into the persisted model. See decision-00004.
- **DSL evolution**: FR3/FR4/FR5/FR8/FR10 extend the schema (Opportunity, subdomain,
  context relationships, nesting, snapshots) — must version and migrate
  (`web/lib/dsl/schema.ts`, `web/lib/dsl/migrate.ts`).
- **CONTEXT.md**: new canonical terms (Opportunity, Subdomain, Context Relationship,
  Context Map, Discovery Mode, Walkthrough, Snapshot, Model Health / Smell) are
  introduced here and must be defined in `CONTEXT.md` at spec time, not before.
- **Scope creep toward collaboration**: keep single-user; resist multiplayer
  pull from discovery/walkthrough features.
- Dependencies: existing React Flow + Zustand + Zod stack; reuses layout engine
  and levels model.

## Sequencing

Suggested delivery order by leverage vs. cost (from analysis-00002 §3):
spec-00007 (health) → spec-00003 (hotspot/opportunity) → spec-00005 (walkthrough)
→ spec-00006 (scale) → spec-00004 (strategic) → spec-00008 (versioning) →
spec-00002 (discovery mode; largest, touches decision-00002). Final order set per
spec planning.
