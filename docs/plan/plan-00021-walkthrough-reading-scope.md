---
id: plan-00021-walkthrough-reading-scope
type: plan
role: main
status: resolved
parent: spec-00005-narrative-walkthrough
---

# Plan: the walkthrough's own reading scope

Implements [us-00029](../us/us-00029-walkthrough-reading-scope.md) per
[spec-00005](../spec/spec-00005-narrative-walkthrough.md), and is the fix for
[issue-00031](../issue/issue-00031-a-walkthrough-step-walks-off-the-isolated-board.md).
Terms follow [CONTEXT.md](../../CONTEXT.md).

The Walkthrough stops borrowing Isolate and carries the reading scope itself:
**every Domain Event stays on the board**, in place, dimmed, with the us-00028
three states; the Current Step gets the isolate *effect* — its neighbourhood
(`both`, depth = the scope) vivid, everything outside it hidden. The scope is a
slider on the stepping card. Isolate as a feature is left alone.

Two consequences follow from "every event stays":

- **Nothing relayouts.** The timeline is the reader's coordinate system, so its
  columns must not move between steps. That rules out `computeIsolateLayout`
  (which compacts the survivors, issue-00021) — the walkthrough filters the full
  board in place instead.
  > **Superseded by [issue-00032](../issue/issue-00032-a-walkthrough-step-leaves-its-slice-scattered.md).**
  > Filtering without relayout left each step's slice scattered across the space the
  > hidden elements vacated. The walkthrough now takes the same relayout; retaining
  > every event is what keeps the columns stable (measured: 0 of 41 moved).
- **The dim layer keeps working.** With Isolate off during a walkthrough,
  `dimActive` is already true and `isoLayout` is already null, so the retained
  spine dims and the three states paint with no change to that machinery. The
  bright set becomes the scope's neighbourhood rather than the 1-hop focus set;
  at scope 1 the two are the same.

## Phase 1 — scope state, and Isolate out of the way

| # | Task | Verify |
|---|---|---|
| P1.1 | `store.ts`: `walk: { active, index, scope }` (view-only, never persisted), `setWalkScope(n)` clamped to 1–`WALK_SCOPE_MAX`; `clear`/`setModel` reset it with the rest of `walk`. | unit store.test.ts: default 1; clamps at both ends; reset on clear |
| P1.2 | `store.ts`: `startWalkthrough` leaves Isolate (inactive, anchor released) — the two are separate reading modes (issue-00031). | unit: isolate active + anchored, start a walkthrough → inactive, anchor null |
| P1.3 | `editor.tsx` / `property-panel.tsx`: Isolate is unavailable while walking — the `i` key bails as it already does for Discovery / Context Map / Compare, and the panel's Isolate block is not offered. | e2e: `i` and the panel control cannot isolate mid-walk |

## Phase 2 — board rendering

| # | Task | Verify |
|---|---|---|
| P2.1 | `editor.tsx`: while walking, keep every Domain Event and the Current Step's `computeNeighborhood(current, {direction:"both", depth: scope})`; hide the rest. Filter the full board — no isolate relayout, so the spine does not move. | e2e: all four events rendered; another slice's Command gone; the current slice's Command present |
| P2.2 | `editor.tsx`: while walking, the bright set is that neighbourhood (its nodes and edges), so the retained out-of-scope events dim and the us-00028 three states paint on the spine. | e2e: the current slice vivid; an upcoming event muted; a visited event on the visited fill |
| P2.3 | `walkthrough.tsx`: a scope slider (1–3) on the stepping card, wired to `setWalkScope`. | e2e: at scope 2 an element one hop further out is rendered that was hidden at scope 1 |

## Out of scope

- Domain Events stay draggable during a walkthrough, so a drag still reorders the
  timeline — `spec-00005-XFR-1` says a walkthrough must not mutate the model, and
  only the arrow-key nudge is suppressed. A separate pre-existing defect; it lands
  in the same `draggable` expression, so it is worth doing next, not here.
  *Closed as a byproduct of issue-00032: the relayout gates the drag.*
- The camera still frames the Current Step alone (`padding 0.4`, `maxZoom 1.5`).
  At scope 2–3 the revealed context can fall outside the frame.
  *Fixed in issue-00032: it frames the step's own slice.*

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- All phases done; `tsc`, `bun run lint`, `bun run build` clean; unit + e2e green.
- Every us-00029 GWT has a passing test, recorded in `docs/record/`.
- Behavioural: walking a board keeps the whole timeline as a dimmed spine with the
  step ringed, shows only the Current Step's slice around it, widens and narrows
  that slice from the card, and never touches Isolate.
