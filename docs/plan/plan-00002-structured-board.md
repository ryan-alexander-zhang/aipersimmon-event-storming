---
id: plan-00002-structured-board
type: plan
role: main
status: resolved
parent: spec-00001-mvp-editor
---

# Plan: rebuild the editor as a structured board

How to build [design-00002-structured-board](../design/design-00002-structured-board.md)
per [decision-00002](../decision/decision-00002-structured-board-not-free-canvas.md).
Reuses the plan-00001 foundation (DSL/store/serialize/React-Flow/custom nodes);
this plan adds the layout engine, DSL v2, and the slice-builder UI, and removes
free positioning.

## Design

See design-00002. Layout = f(type → row-band, context + timeline order → column);
slice builder is the primary interaction; positions are derived, never dragged.

## Tasks

| # | Task | Delivers | Depends | Verify |
|---|---|---|---|---|
| RT1 | DSL v2: schema (contexts, node.context/order, drop position, version 2.0), `updates` relation + band order, v1→v2 migration in importJSON | us-00004, us-00006, us-00007-FR-2 | — | unit: v2 parse/round-trip; v1 file migrates (positions dropped, default context/order); `updates` in rule table |
| RT2 | Layout engine (`lib/layout`): type→row, context+order→column, slice column propagation | spec-00001-XFR-4/5 | RT1 | unit: deterministic positions; same model → same layout; each type in its band |
| RT3 | Store v2: contexts + order state; addContext / addEvent / reorderEvent / reassignContext; slice-add helpers; recompute layout on change; drop position | us-00001, us-00006, us-00007 | RT1 | unit: each action mutates state + relations correctly |
| RT4 | Board render: React Flow `nodesDraggable=false`, positions from RT2, band rail + context headers, edge labels/arrows (reuse nodes) | spec-00001-XFR-4/5 | RT2,RT3 | run: bands + context columns render; nodes not free-draggable |
| RT5 | Slice builder UI: select event/command → +Command/+Actor/+Aggregate/+Policy/+Read Model/+Hotspot; property panel reused | us-00007, us-00001, us-00003 | RT4 | run: slice action creates grammar-correct element in its band |
| RT6 | Timeline reorder + context reassignment (the only moves); manual validated links for cross-context | us-00006, us-00002 | RT4 | run: reorder swaps columns; reassign moves context; invalid manual link rejected |
| RT7 | Export/import v2 + autosave (adapt serialize + persistence to v2 + migration) | us-00004, us-00005 | RT1,RT3 | run+unit: round-trip preserves contexts/order; reload restores; v1 import migrates |
| RT8 | Retire free-drag palette-drop; repurpose palette as slice/context add; cleanup | us-00001 re-scope | RT5 | run: no free drop path remains |
| RT9 | Level filter (Big Picture / Process / Design): store level, toolbar selector, hide types/bands/slice actions, serialize `meta.level` | us-00008 | RT4,RT5 | run+unit: each level shows the right bands; level round-trips |
| RT10 | Concurrent events: same `order` share a column, stack in sub-lanes; slice inherits lane | us-00009 | RT2 | unit: same-order events share x, differ in y |
| RT11 | Review fixes: reserve context column slots + editable/removable headers; 4-side handles + geometry connector routing; External System creatable + distinct | us-00006, us-00007, us-00001 | RT4,RT5 | run: contexts side-by-side & renamable; vertical chain connects top↔bottom; System creatable & distinct |

## Detailed Acceptance Path

`resolved` only when:

- RT1–RT8 done; `bunx tsc`, `bun run lint`, `bun run build` clean; unit coverage
  on `lib/**` ≥90% ([TESTING.md](../../TESTING.md)).
- Every GWT below has a passing test (unit + Playwright E2E):

| Requirement | GWT |
|---|---|
| us-00001 add into band | us-00001-AC-1.1, -2.1, -3.1, -4.1 |
| us-00002 grammar links / reject | us-00002-AC-1.1, -2.1 |
| us-00003 hotspot | us-00003-AC-1.1, -2.1 |
| us-00004 v2 round-trip | us-00004-AC-1.1, -3.1 |
| us-00005 persistence | us-00005-AC-1.1, -2.1 |
| us-00006 contexts + timeline | us-00006-AC-1.1, -3.1, -4.1 |
| us-00007 slice + computed layout | us-00007-AC-1.1, -2.1, -4.1 |
| us-00008 levels | us-00008-AC-1.1, -2.1 |
| us-00009 concurrent events | us-00009-AC-1.1 |
| spec cross-cutting | spec-00001-XAC-1.1, -2.1, -4.1 |

- Before `resolved`: a subagent verifies every GWT maps to a passing test, then a
  `docs/record/` acceptance checklist links the GWT ids (per [AGENTS.md](../../AGENTS.md)).
