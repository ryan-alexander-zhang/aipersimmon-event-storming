---
id: record-00012-discovery-mode-acceptance
type: record
role: main
status: active
parent: plan-00012-discovery-mode
---

# Acceptance record: discovery mode (chaotic exploration → converge)

Acceptance evidence for [plan-00012](../plan/plan-00012-discovery-mode.md),
implementing [us-00016](../us/us-00016-discovery-free-placement.md) and
[us-00017](../us/us-00017-converge-to-structured-board.md) per
[spec-00002](../spec/spec-00002-discovery-mode.md) /
[design-00006](../design/design-00006-discovery-surface.md), within the bounds of
[decision-00004](../decision/decision-00004-discovery-mode-free-placement.md).
Verified 2026-07-22. An independent subagent cross-checked every us-00016 /
us-00017 GWT and both spec-00002-XAC scenarios against the tests; verdict
**PASS**. The two items it flagged WEAK (converged-event export shape;
grammar-active-while-discovery-off) were then closed with direct tests.

## Gate results

- Unit: **187 passed** (`bun run test`); `lib/**` coverage ≥90% lines/funcs
  (`store.ts` 100% lines / 98.4% funcs, `persistence.ts` 100% lines / 100% funcs).
- E2E: **35 passed** (`bun run test:e2e`, Playwright/chromium).
- `bunx tsc --noEmit`, `bun run lint`, `bun run build` all clean.

## GWT / XAC coverage

| Id | Test(s) | Result |
| --- | --- | --- |
| us-00016-AC-1.1 (control unavailable off Big Picture) | store.test.ts "enters only at Big Picture; toggles off cleanly"; e2e "discovery mode is Big-Picture only…" (controls count 0 at Design, visible at Big Picture) | pass |
| us-00016-AC-1.2 (toggle on/off, model unaltered) | store.test.ts "enters only at Big Picture; toggles off cleanly" | pass |
| us-00016-AC-2.1 (free positions, no order, no validation error) | store.test.ts "adds unordered events at free positions without touching the model"; e2e "renames a wall event…" | pass |
| us-00016-AC-3.1 (drag wall event; structured orders unchanged) | store.test.ts "drags a wall event without reordering structured events" | pass |
| us-00016-AC-4.1 (rename + delete affect wall only) | store.test.ts "renames and deletes wall events only"; e2e delete affordance | pass |
| us-00016-AC-5.1 (export contains no wall event/position) | persistence.test.ts "keeps the wall entirely out of the model DSL"; e2e "…stays out of the exported DSL" (exported.nodes length 0) | pass |
| us-00016-AC-6.1 (reload restores wall at same positions) | persistence.test.ts "round-trips the discovery wall"; e2e reload → discovery-node restored | pass |
| us-00017-AC-1.1 (converge → +N events, wall empty, mode off) | store.test.ts "converges left→right…" & "appends…"; e2e converge → 2 domainEvents, 0 discovery-node | pass |
| us-00017-AC-2.1 (C=300, A=50, B=150 → order A,B,C) | store.test.ts "converges left→right x into Ungrouped ordered events, clearing the wall" | pass |
| us-00017-AC-2.2 (append after existing order N) | store.test.ts "appends the converged block after existing events" | pass |
| us-00017-AC-3.1 (converged events Ungrouped) | store.test.ts "converges left→right…" (every context undefined) | pass |
| us-00017-AC-4.1 (converged event exports with order, no position) | store.test.ts "a converged event exports with a global order and no position, like a normal event" | pass (added to close WEAK) |
| us-00017-AC-5.1 (empty wall converge = no-op, mode off) | store.test.ts "converging an empty wall is a no-op that leaves the mode" | pass |
| spec-00002-XAC-1.1 (export + re-import → no wall data) | persistence.test.ts "keeps the wall entirely out of the model DSL [… XAC-1.1]" | pass |
| spec-00002-XAC-2.1 (off Big Picture → no control AND grammar active) | e2e "discovery mode is Big-Picture only…" (no control at Design) + store.test.ts "keeps grammar validation active at Design while discovery is off" | pass (grammar half added to close WEAK) |

## Manual verification (not automatable)

Per the repo convention (React Flow node-drag is not simulable in Playwright —
see the timeline-drag note in `editor.spec.ts` and the RF-drag memory), the drag
*gesture* was checked in a real browser: the Discovery surface renders (dotted
canvas, orange Domain-Event stickies with delete affordance), the toolbar
Discover/+ Event/Converge controls work, inline rename works, and a node reports
the `draggable` class. The drag-to-reposition gesture itself was exercised
manually; the underlying `moveDiscoveryItem` action and the converge-by-x ordering
logic are unit-tested (us-00016-AC-3.1, us-00017-AC-2.1).

A bug found during that browser pass — a wrapper-level double-click-to-add handler
also fired when double-clicking a node to rename, spawning a spurious event — was
resolved by removing the double-click-to-add path entirely; adding is via the
toolbar "+ Event" button (covered by e2e "renames a wall event…").

## Deliverables

- `store.ts`: transient `discovery: { active, items }` slice; `enterDiscovery`
  (Big-Picture guard) / `exitDiscovery`; `addDiscoveryItem` / `moveDiscoveryItem` /
  `updateDiscoveryItem` / `removeDiscoveryItem`; `converge()` (sort by x → `addNode`
  per item, Ungrouped, then clear + exit); `setLevel` off Big Picture exits;
  `clear` / `setModel` reset the slice.
- `persistence.ts`: `saveDiscovery` / `loadDiscovery` / `clearDiscovery` under
  `event-storming:discovery`, separate from the model DSL; `exportJSON` /
  `saveModel` untouched.
- `discovery-canvas.tsx` + `nodes/discovery-node.tsx`: an isolated React Flow
  surface of freely-draggable Domain-Event stickies (no edges, no grammar), inline
  rename + delete.
- `editor.tsx`: renders the discovery surface when active (structured chrome /
  panel hidden); discovery autosave + hydrate.
- `toolbar.tsx`: Big-Picture-only Discover toggle, "+ Event", and Converge.
- `CONTEXT.md`: **Discovery Mode** and **Converge** added (glossary-only).
- **No DSL/schema change, no migration** — discovery never touches the model shape
  (decision-00004 invariant, held by construction).

## Deferred (recorded, not gaps)

- Double-click-on-pane to add and interleave-on-converge were considered and
  dropped for v1 (append-only converge per the user decision; add via toolbar).
  Interleaving into an existing timeline is left to post-converge timeline drag.
