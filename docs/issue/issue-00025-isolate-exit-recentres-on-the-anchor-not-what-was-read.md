---
id: issue-00025-isolate-exit-recentres-on-the-anchor-not-what-was-read
type: issue
role: main
status: resolved
parent: plan-00005-readability-tier-c-isolate-semantic-zoom
---

# Leaving Isolate recentres on the anchor, not on the element that was being read

## Problem

Leaving Isolate put the camera on the **anchor** — the element the view was framed
on — regardless of what the modeller had been reading inside that view. Since the
anchor is pinned (issue-00024), clicking another element inside the view is a normal
way to read it; exiting then jumped the camera away from that element, back to the
anchor, and the element just clicked could land hundreds of pixels off screen
centre. The whole point of the recentre (issue-00021) is "don't make me hunt for
what I was just looking at", so the target was wrong.

It reads as intermittent because it depends on whether anything else was clicked
before exiting: exit straight away and the anchor *is* what you last clicked, so the
camera looks right; poke at one more element first and it looks broken.

## Context / Trigger

Reported as "after clicking empty space to exit, the camera does not focus the
element I clicked — and oddly it only happens sometimes." Scripted repro of the
plain path (12 consecutive enter/exit cycles, plus variants for anchor type, fast
exit, zoom-out, pan, edge hover) never failed, which is what pointed at the
click-something-else-first path.

## Root Cause (first principles)

1. **Observed**: on exit the camera centres the anchor. **Expected**: it centres the
   element the modeller was reading when they left.
2. **Mechanism**: the exit target was a single ref holding the anchor
   (`anchorRef`, [`editor.tsx`](../../web/components/editor.tsx)), written from
   `anchorId` while isolating and read by the refit effect. The selection made
   *inside* the view was never recorded, so it could not be a target.
3. **True root cause**: **the camera target was tied to the view's subject rather
   than to the modeller's attention.** Those coincided only until the anchor was
   pinned (issue-00024) — pinning is what made "what the view is about" and "what I
   am looking at" two different things, and the recentre kept using the first.
   - Ruled out by measurement, not reasoning: `getNode` returning nothing on exit,
     the fit racing the remount of the full board, semantic zoom unmounting the
     anchor, panning/zooming while isolated, exiting mid-animation, and the dev vs
     production build — the plain path recentres exactly (off-centre 0px) in all of
     them.

## Reproduction

Live, on `examples/ride-hailing-event-storming.json` (production build): isolate on
**Ride Requested** (both, depth 2), click **Nearby Cars View** inside the view, then
click empty canvas.

- Before: anchor `Ride Requested` off-centre **0px**, last-read `Nearby Cars View`
  off-centre **614px**.
- After: `Nearby Cars View` **0px**, `Ride Requested` **614px** — the exact
  inversion.

Regression spec `e2e/editor.spec.ts` (issue-00025) on `fixtures/model.json`: isolate
on `e1`, click `rm1`, exit → `rm1` must be within 60px of the canvas centre and `e1`
beyond it. The pre-fix behaviour is the inverse, so it fails before.

## Fix

`editor.tsx`: replace the anchor-only ref with the view's read state —
`{ anchor, selection }`, where `selection` is the last element selected inside the
view (never the anchor itself, and never erased by a null `selectedId`, so the
clearing click cannot race it away). The refit resolves the first of
`[selection, anchor]` that is still on the board, and falls back to fitting the whole
board if neither is. A new anchor resets the pair, so one view's reading never leaks
into the next.

Behaviour when nothing else was clicked is unchanged: `selection` is null and the
camera lands on the anchor (the issue-00021 spec still passes).

## Verification

- Live: the 614px/0px inversion above.
- Regression spec (issue-00025) passes; the issue-00021 spec ("leaving Isolate keeps
  the camera on the anchor, not on the whole board") still passes unchanged.
- 12 consecutive plain enter/exit cycles: anchor centred at 0px off-centre every
  time.
- Gates: e2e **62 passed** on 3 consecutive runs, unit **276 passed**, `tsc` and
  `lint` clean.
