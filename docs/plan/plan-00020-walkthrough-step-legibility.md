---
id: plan-00020-walkthrough-step-legibility
type: plan
role: main
status: resolved
parent: spec-00005-narrative-walkthrough
---

# Plan: walkthrough step legibility

Implements [us-00028](../us/us-00028-walkthrough-step-legibility.md) per
[spec-00005](../spec/spec-00005-narrative-walkthrough.md). Rendering and controls
only — the cursor, the order, and the read-only contract are unchanged, so there
is no new store state and no new pure logic. Terms follow
[CONTEXT.md](../../CONTEXT.md).

The one design constraint: the Step Ring and the three-state fill are delivered as
**injected CSS keyed by `data-id`**, the route the dim layer already takes, so a
step never rebuilds a node object and cannot regress issue-00019.

## Phase 1 — board rendering

| # | Task | Verify |
|---|---|---|
| P1.1 | `app/globals.css`: `@keyframes es-walk-step` — a halo that expands from the Step Ring and fades. | run: the halo plays once per step |
| P1.2 | `editor.tsx`: derive `{ current, visited }` from `timelineOrder(nodes)` + `walk.index` while walking; inject the Step Ring rule (replacing the selection outline on that node, plus a `prefers-reduced-motion` override) and the Visited fill rule; exclude Visited ids from the dim fill selector so the two rules do not fight on specificity. | e2e: ring on the current event only (us-00028-AC-1.1); ring + animation move on a step (AC-2.1); visited / upcoming / current paint three different fills (AC-3.1) |

## Phase 2 — overlay and controls

| # | Task | Verify |
|---|---|---|
| P2.1 | `walkthrough.tsx`: lead with the label (`text-sm font-semibold`), demote `n / N`, add a progress bar across the card's bottom edge. | e2e: label, `2 / 4`, progress width ≈50% (AC-4.1) |
| P2.2 | `walkthrough.tsx`: ←/→ step the cursor (ignored while typing in a field), advertised via `aria-keyshortcuts` on Prev/Next. The editor's arrow handler already returns while `walk.active`, so the timeline nudge stays suppressed (spec-00005-XFR-1). | e2e: ArrowLeft on the last event steps back and leaves the board order unchanged (AC-5.1) |
| P2.3 | Update the existing walkthrough e2e: its read-only check used "the label did not flip" as the proxy for "no reorder", which arrow stepping invalidates. Re-express us-00014-AC-4.1 as the board's left→right order, unchanged. | `bun run test:e2e` green |

## Docs

| # | Task |
|---|---|
| D1 | `spec-00005` §1 / §2 / §4: reverse the "navigation is via on-screen controls, not arrow keys" decision (arrows step the cursor; they never write to the model, so XFR-1 still holds), list US28. |
| D2 | `CONTEXT.md`: add **Current Step**, **Visited**, **Upcoming**, **Step Ring** under Walkthrough. |

## Out of scope

- The overlay overlapping the framed event at high zoom (the card is fixed to the
  canvas bottom while `fitView` centres the node). Camera geometry, not step
  legibility.
- A clickable segmented progress rail and prev/next event names in the overlay —
  deferred; they need a `walkTo(index)` action.

## Acceptance path

Recorded in
[record-00020](../record/record-00020-walkthrough-step-legibility-acceptance.md).
`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- Phase 1 + Phase 2 + Docs tasks done; `tsc`, `bun run lint`, `bun run build`
  clean; unit + e2e green.
- Every us-00028 GWT has a passing test, recorded in `docs/record/`.
- Behavioural: a step is obvious at a glance — the current event is ringed and
  pulses, the events behind the cursor read as walked, the overlay leads with the
  event name and shows progress, and ←/→ step without touching the model.
