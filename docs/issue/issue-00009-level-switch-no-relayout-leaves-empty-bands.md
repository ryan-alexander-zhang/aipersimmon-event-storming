---
id: issue-00009-level-switch-no-relayout-leaves-empty-bands
type: issue
role: main
status: resolved
parent: plan-00005-readability-tier-c-isolate-semantic-zoom
---

# Switching Level hides element types but never reflows, leaving empty bands

## Problem

Selecting a coarser Level (e.g. **Big Picture**) hides the element types that
level excludes, but the surviving elements keep the positions computed for the
full Design layout. The bands reserved for the now-hidden types (Command,
Constraint, Aggregate, Policy, Read Model) stay as empty vertical space, so the
visible stickies sit far apart with large gaps between them. Big Picture — which
should read as a compact Actor → Domain Event → Hotspot backbone — instead looks
sparse and stretched, and the surviving elements appear oversized whenever a
`fitView` scales that near-empty box to the viewport.

## Context / Trigger

Raised as a UI concern: at Big Picture, Actor / Domain Event / Hotspot look
"very large" and scattered. Confirmed by reading the code — not a rendering
glitch but a consequence of the layout never being recomputed for the Level.

Band order ([`elements.ts:38`](../../web/lib/eventstorming/elements.ts)) is
`actorSystem · command · constraint · aggregate · domainEvent · policy ·
readModel · hotspot` (rows 0–7). Big Picture shows only rows 0 (Actor / External
System), 4 (Domain Event) and 7 (Hotspot). With `BAND_H = 132` and no
concurrency stacking, band tops are `[0,132,264,396,528,660,792,924]`, so an
Actor (y=0) and the Domain Event it issues (y=528) are **528px apart** with three
empty bands (Command, Constraint, Aggregate) between them.

## Root Cause (first principles)

1. **Observed**: switching to Big Picture keeps every surviving node at its
   full-Design y; the Command / Constraint / Aggregate bands between Actor and
   Domain Event remain as empty height. **Expected**: the visible bands collapse
   adjacent, so Big Picture is a compact three-row view.
2. **Mechanism**:
   - `setLevel` is a pure state write — it does **not** relayout
     ([`store.ts:107`](../../web/lib/store/store.ts): `setLevel: (level) => set({ level })`),
     unlike every structural mutation, which routes through
     `laidOut → computeLayout` ([`store.ts:93`](../../web/lib/store/store.ts)).
   - Visibility is applied at render time by *removing* hidden-type nodes from
     the array handed to React Flow
     ([`editor.tsx:280`](../../web/components/editor.tsx) `visibleNodes`), never
     by recomputing positions.
   - `computeLayout` accumulates `bandTops` over the full `BAND_ORDER` regardless
     of which types are present or visible
     ([`layout.ts:176`](../../web/lib/layout/layout.ts):
     `bandTops[r] = bandTops[r-1] + maxSubRow[r-1]*STACK_H + BAND_H`), so a band
     with no visible node still reserves its `BAND_H`.
3. **True root cause**: position is a pure function of `(model)` only; it is
   **not** a function of the current Level, so hiding a whole band cannot
   reclaim its space. The oversized-sticky symptom is downstream of the same
   cause (a sparse box zoomed to fit), not a node-sizing bug — node size is fixed
   ([`element-node.tsx:96`](../../web/components/nodes/element-node.tsx)).

## Design-invariant conflict (must be resolved to fix)

Current behavior **matches the documented spec**:
[design-00002 §8](../design/design-00002-structured-board.md) states a Level "is a
view filter over the same model — switching it shows/hides element types (and
their bands) ... it never deletes anything", and
[plan-00005](../plan/plan-00005-readability-tier-c-isolate-semantic-zoom.md) built
level/zoom detail as "view/interaction layer only — no layout-engine change".

So this is not an implementation slip; it is a gap in that design decision — it
specified the *hide* mechanism but not the *reflow* of the space a hidden band
vacates. Fixing it makes layout a function of `(model, Level)`, a deliberate
refinement of the §8 invariant that must be recorded there before the fix lands.

Critical constraint: the reflow must key on **Level** (a discrete, intentional
switch), **not** on semantic zoom (`typesForZoom`,
[`levels.ts:50`](../../web/lib/eventstorming/levels.ts)). Semantic zoom drops
detail continuously as the wheel turns; relaying out on it would make nodes jump
mid-zoom. Positions stay a function of `(model, Level)` — never of `zoom`.

## Reproduction (test-first)

Written failing before the fix, green after:

- `store.test.ts` (issue-00009): one context with a connected
  Actor → Command → Domain Event. At Design the Actor→Event vertical gap is
  `4 * BAND_H` (Command/Constraint/Aggregate bands between). After
  `setLevel("big-picture")` it must be `BAND_H` (adjacent). Failed before (gap
  stayed `528`, `setLevel` never relayouts); passes after.
- `layout.test.ts` (issue-00009): `computeLayout` at `"big-picture"` places the
  Domain Event one `BAND_H` below the Actor, vs `bandIndex("domainEvent")*BAND_H`
  at `"design"`; plus a guard that the default (no level) equals `"design"`.

## Fix

Made layout a function of `(model, level)`:

- `layout.ts`: `computeLayout` / `computeBandTops` take an optional
  `level: Level = "design"`; `computeRows` skips the height of any band with no
  type visible at the level, so visible bands collapse adjacent (default =
  `"design"` = all bands = the previous layout, byte-identical).
- `store.ts`: `laidOut` threads the level; `setLevel` now relayouts, so switching
  level reflows the board.
- `board-chrome.tsx`: the band rail passes `level` so its labels track the
  collapsed band tops.

The board reflows **in place** — the camera/zoom is left untouched on a switch
(no auto-refit), so switching level never zooms the stickies up (the original
"very large" symptom). Semantic zoom stays render-only (no relayout) — layout
never depends on `zoom`. design-00002 §8 updated to record the reflow-per-level
behavior.

## Verification

- Regression tests `store.test.ts` + `layout.test.ts` (issue-00009): fail before
  the fix, pass after.
- Gates: unit **137 passed**, e2e **26 passed** (incl. "level filter hides types
  without deleting them" — hide semantics intact), `tsc` / lint clean.
- Live (ride-hailing example, `localhost:3000`): switching Design → Big Picture
  drops from 8 spread bands to a compact Actors/Systems → Domain Events →
  Hot Spots stack with the hidden bands' vertical space reclaimed. Confirmed by
  screenshot.
