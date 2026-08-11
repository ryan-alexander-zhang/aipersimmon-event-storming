---
id: issue-00026-band-rail-replaces-the-placement-pass-every-frame
type: issue
role: main
status: resolved
parent: spec-00001-mvp-editor
---

# The band rail re-runs the whole placement pass on every pan/zoom frame

## Problem

`BoardChrome` tracks the React Flow viewport, so it re-renders on **every frame of
a pan or zoom gesture**. It computed its band tops in the render body:

```ts
const bandTops = computeBandTops(nodes, edges, contexts, level);
```

`computeBandTops` runs the full `computePlacement` pass, which is O(nodes × edges)
— `sourceOf`/`targetsOf` scan the whole edge list once per node. Band tops are a
function of the model alone and cannot change during a gesture, so every frame paid
for a result that was already known. Measured at **0.47ms per call** on a
141-node/222-edge board — about 3% of a 16.7ms frame budget, growing with the
product of nodes and edges.

Not a visible stall on its own; it is waste in the one code path that runs at frame
rate, and the term that grows fastest as models get bigger.

## Context / Trigger

Found while measuring an "importing a bigger board feels laggy" report against a
141-node/222-edge model. The lag itself was **not** this: production frames were
14–20ms while the same gesture on the dev build was 53–71ms, and dev-vs-dev and
prod-vs-prod comparisons across the preceding Isolate work
([issue-00021](issue-00021-isolate-hides-without-relayout.md) …
[-00025](issue-00025-isolate-exit-recentres-on-the-anchor-not-what-was-read.md))
were identical within noise. This came out of the same profile as a real, separate
inefficiency.

## Root Cause (first principles)

1. **Observed**: a pan gesture spends CPU inside `computePlacement` /
   `computeRows` / `sourceOf`. **Expected**: a gesture that changes only the
   camera does no model-layout work.
2. **Mechanism**: two independent facts combine —
   `useViewport()` ([`board-chrome.tsx:52`](../../web/components/board-chrome.tsx))
   re-renders the component per frame, and the band tops were computed inline, so
   they were recomputed per render.
3. **True root cause**: **a model-derived value was placed in a
   viewport-derived render path** with nothing separating the two lifetimes. The
   layout cost was never per-frame by design; it became per-frame because the value
   sits in a component whose render rate is the camera's.
   - Ruled out (by measurement, not reasoning): this being the cause of the reported
     lag — see Context; and the node/edge decoration chain in `editor.tsx`, which
     issue-00019 already keeps off the hover/zoom path.

## Reproduction

A failing unit or e2e test is not practical: the effect is 0.47ms per frame, far
below the noise of a frame-time assertion, and the call count is not observable
from the DOM. Per `docs/issue/README.md` the strongest available verification is
recorded instead — a CDP sampling profile (200µs interval) of one pan gesture on a
171-node/210-edge board, dev build so frames carry real function names, counting
samples attributed to the layout pass:

- **Before**: 104 samples ≈ **21ms** of the gesture —
  `computePlacement` 60, `sourceOf` 22, `computeRows` 14, `computeBandTops` 5,
  `BoardChrome` 3.
- **After**: 3 samples ≈ **1ms**, all in `BoardChrome` itself;
  `computePlacement`, `computeRows`, `sourceOf` and `computeBandTops` no longer
  appear at all.

## Fix

`board-chrome.tsx`: memoise `bandTops` on its actual inputs
(`[isolated, nodes, edges, contexts, level]`) and `visibleBands` on
`[isolated, level]`. Both are exactly the values the results derive from, so the
rail cannot go stale — a model edit, a Level switch, or an Isolate reflow still
recomputes it; a camera move no longer does.

## Verification

- The profile above: layout samples during a pan drop from 104 to 3.
- Gates: unit **276 passed**, e2e **62 passed** on 2 consecutive runs, `tsc` and
  `lint` clean. The band rail's own e2e coverage (level filtering, the fixed-height
  context legend, the Isolate rail) still passes, so the memoised values stay
  correct.
