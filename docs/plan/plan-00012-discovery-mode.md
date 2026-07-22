---
id: plan-00012-discovery-mode
type: plan
role: main
status: resolved
parent: spec-00002-discovery-mode
---

# Plan: discovery mode (chaotic exploration → converge)

Implements [us-00016](../us/us-00016-discovery-free-placement.md) and
[us-00017](../us/us-00017-converge-to-structured-board.md) per
[spec-00002](../spec/spec-00002-discovery-mode.md) and
[design-00006](../design/design-00006-discovery-surface.md), within the bounds of
[decision-00004](../decision/decision-00004-discovery-mode-free-placement.md).
No DSL/schema change — discovery state is transient and separately persisted.
Terms follow [CONTEXT.md](../../CONTEXT.md).

## Phase 1 — store slice + converge (model core, pure logic)

| # | Task | Verify |
|---|---|---|
| P1.1 | `store.ts`: add transient `discovery: { active, items }` slice + `enterDiscovery` (no-op unless big-picture) / `exitDiscovery`, `addDiscoveryItem`/`moveDiscoveryItem`/`updateDiscoveryItem`/`removeDiscoveryItem`; `setLevel` off big-picture exits discovery; `clear`/`setModel` reset it. | unit: enter guarded to big-picture (AC-1.1/1.2); add/move/rename/delete affect only the wall, not `nodes` (AC-2.1/3.1/4.1) |
| P1.2 | `store.ts`: `converge()` — sort `items` by `(x, id)`, `addNode("domainEvent")` per item, clear wall, exit mode. | unit: 3 items → 3 Ungrouped events in left→right order (AC-2.1); appends after existing order N (AC-2.2); empty wall = no-op exit (AC-5.1); Ungrouped (us-00017-AC-3.1) |

## Phase 2 — persistence (separate key, DSL untouched)

| # | Task | Verify |
|---|---|---|
| P2.1 | `persistence.ts`: `saveDiscovery`/`loadDiscovery`/`clearDiscovery` under `event-storming:discovery`; best-effort, ignore corrupt. | unit: round-trip items; corrupt entry → empty wall |
| P2.2 | Prove isolation: `exportJSON`/`saveModel` never include discovery items; a wall present during export/import round-trips to no discovery data. | unit serialize: DSL has no discovery event/position (us-00016-AC-5.1, spec-00002-XAC-1.1) |

## Phase 3 — surface + toolbar (UI)

| # | Task | Verify |
|---|---|---|
| P3.1 | `editor.tsx`: when `discovery.active`, feed React Flow the wall items as freely-draggable Domain-Event nodes at `{x,y}` (bypass `computeLayout`); drag → `moveDiscoveryItem`; no edges/`isValidConnection`; hide structured chrome. Add-event affordance → `addDiscoveryItem`. | run/e2e: drop, drag, rename, delete on the wall; structured orders unchanged (AC-3.1) |
| P3.2 | `toolbar.tsx`: Discovery toggle + Converge button next to Level, enabled only at Big Picture. | run/e2e: control hidden/disabled off Big Picture (AC-1.1, spec-00002-XAC-2.1) |
| P3.3 | `editor.tsx`: autosave effect for `discovery.items`; restore on mount. | run/e2e: reload restores the wall at same positions (AC-6.1) |

## Phase 4 — docs reconciliation

| # | Task | Verify |
|---|---|---|
| P4.1 | Add **Discovery Mode** and **Converge** to CONTEXT.md (glossary-only). | docs consistent with code |
| P4.2 | Promote us-00016/us-00017/spec-00002/design-00006 to `active` on review; this plan → `open`. | statuses correct per DOCUMENT.md |

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- All phases done; `tsc`, `bun run lint`, `bun run build` clean; unit + e2e green;
  `lib/**` coverage ≥90% (lines/funcs) held.
- Behavioural: at Big Picture, drop/drag/rename/delete unordered events on a wall
  that survives reload; Converge orders them left→right into Ungrouped structured
  events; the exported DSL never contains a discovery event or free position;
  Discovery is unavailable off Big Picture.
- A subagent verifies from the docs that every us-00016 / us-00017 GWT and
  spec-00002-XAC scenario has a passing test and no requirement is unfinished; a
  `docs/record/` acceptance checklist links the GWT/XAC ids (CLAUDE.md §7). Any gap
  blocks `resolved`.

**Verified 2026-07-22** — subagent verdict PASS; two WEAK items closed with direct
tests (us-00017-AC-4.1 export shape; spec-00002-XAC-2.1 grammar-active half).
Acceptance evidence in
[record-00012-discovery-mode-acceptance](../record/record-00012-discovery-mode-acceptance.md).
187 unit + 35 e2e green; tsc/lint/build clean.
