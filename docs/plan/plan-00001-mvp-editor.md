---
id: plan-00001-mvp-editor
type: plan
role: main
status: resolved
parent: spec-00001-mvp-editor
---

# Plan: MVP Event Storming editor

How to build [spec-00001-mvp-editor](../spec/spec-00001-mvp-editor.md). Technical
design (model, connection rules, data flow, `web/` layout) lives in
[design-00001-editor-model-and-architecture](../design/design-00001-editor-model-and-architecture.md);
this plan does not restate it. Requirements and acceptance live in the linked
`us` docs and the spec's cross-cutting section.

## Design

See [design-00001](../design/design-00001-editor-model-and-architecture.md).
Key points that shape the tasks: model is uniform nodes+edges (Hotspot is a
node, Pivotal is a flag); the connection-rule table drives `isValidConnection`;
the Zod DSL schema is the single source of truth for types, export, and import.

## Tasks

Cohesive and low-dependency; T2/T3 run in parallel after T1, and T5/T7/T8 in
parallel once the canvas exists. Each task cites the requirement(s) it delivers.

| # | Task | Delivers | Depends | Verify |
|---|---|---|---|---|
| T1 | DSL Zod schema + element/relation definitions + connection-rule table | foundation for all `us` | — | unit: schema accepts valid model, rejects bad type/relation; rule table matches design-00001 §2 |
| T2 | Export/import (store↔DSL serialize, `safeParse`, version stamp/guard) | us-00004, spec-00001-XFR-2/3 | T1 | unit: round-trip identity incl. positions; malformed/invalid rejected; unknown version rejected |
| T3 | Zustand store (nodes, edges, selection + add/update/remove/connect) | us-00001, us-00003 | T1 | unit: each action mutates state correctly |
| T4 | Canvas shell — React Flow, client-only, grid, minimap, zoom/pan | enables US1–US3 | T3 | run: canvas renders, pans, zooms; no SSR error |
| T5 | Custom node components per element type (color, icon, inline-edit label; Pivotal marker) | us-00001-FR-1/2/3 | T4 | run: each type renders with color/icon; label edits hit the store |
| T6 | Element palette + drag-to-create | us-00001-FR-1 | T4,T5 | run: dragging a palette item drops a typed node at the cursor |
| T7 | Semantic edges + `isValidConnection` + relation labels | us-00002 | T4,T1 | run: valid connection allowed+labeled; invalid rejected with feedback |
| T8 | Property panel (label, description, pivotal, delete; hotspot text) | us-00001-FR-2/3/4, us-00003-FR-2 | T3,T5 | run: editing the selection updates canvas + store |
| T9 | Export/import UI (download/upload JSON) wiring T2 | us-00004 | T2,T4 | run: export downloads a file; re-importing restores the model |
| T10 | Local autosave (debounced persist + safe hydrate) | us-00005 | T2,T3 | run: reload restores model; corrupt storage starts empty |
| T11 | (optional) canvas tidy / left-to-right auto-layout | — | T4 | run: tidy arranges nodes without overlap |

Each task follows [TESTING.md](../../TESTING.md): unit tests for logic (T1–T3),
E2E for the interactive flows (below).

## Detailed Acceptance Path

The plan is `resolved` only when all of the following hold.

**All tasks done**: T1–T10 complete (T11 optional); working tree clean;
`bun run lint` and `bun run build` pass in `web/`.

**Every GWT has a passing test** — the plan delivers exactly these, verified by
unit + E2E ([E2E_TESTING.md](../../E2E_TESTING.md)):

| Requirement | GWT | Level |
|---|---|---|
| us-00001 place/edit/pivotal/delete | us-00001-AC-1.1, -2.1, -3.1, -4.1 | E2E + unit (store) |
| us-00002 connect / reject | us-00002-AC-1.1, -2.1 | E2E + unit (rules) |
| us-00003 hotspot | us-00003-AC-1.1, -2.1 | E2E |
| us-00004 export/import round-trip | us-00004-AC-1.1, -3.1 | E2E + unit (round-trip) |
| us-00005 persistence | us-00005-AC-1.1, -2.1 | E2E |
| spec cross-cutting | spec-00001-XAC-1.1 (no network), -2.1 (invalid import) | E2E + unit |

**Coverage**: meets the [TESTING.md](../../TESTING.md) bar (90% line/branch/
function) for executable changes.

**Verification & record**: before flipping to `resolved`, a subagent verifies
from the docs that every GWT above has a passing test and no task is unfinished,
then a `docs/record/` acceptance checklist links the GWT ids (per the repo rule
in [AGENTS.md](../../AGENTS.md)). Any gap blocks `resolved`.
