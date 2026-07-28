---
id: issue-00019-hover-and-zoom-rebuild-the-whole-board
type: issue
role: main
status: resolved
parent: spec-00001-mvp-editor
---

# Hovering an element and zooming both re-render the whole board, so the canvas stutters as the model grows

## Problem

On a board of realistic size the canvas feels laggy in two ways:

1. **Moving the pointer across elements.** Every time the pointer enters or leaves
   an element the board stalls briefly.
2. **Zooming in/out.** A single wheel gesture stutters badly — worse than hover.

Both scale with the model: barely noticeable on a handful of elements, obvious on
the shipped examples (~53 nodes), unusable at a few hundred.

## Context / trigger

Board view only, at any Level. No model change is involved — both are view-only
interactions. Panning is *not* affected (React Flow moves the viewport with a CSS
transform and re-renders nothing), which is the control that isolates the defect to
re-render cost rather than paint cost.

## Root cause (first principles)

1. **Observed**: a pointer-enter, or one frame of a zoom gesture, costs work
   proportional to (nodes + edges) in the whole model. **Expected**: it costs work
   proportional to what actually changed — one element for hover, nothing at all for
   a zoom that does not cross a semantic-zoom threshold.
2. **Shared mechanism**: `components/editor.tsx` derives the *view state* of every
   element on every render. `decoratedNodes` (`editor.tsx:367-378`) maps all visible
   nodes to `{...n, style}` objects and `decoratedEdges` (`editor.tsx:402-437`) maps
   all visible edges to objects with a fresh `data` object. Both take the dim/hover
   state as inputs, so any change to that state produces a brand-new object for
   **every** element. React Flow keys its internal work off those objects, so all
   node wrappers (each `ElementNode` renders 8 `<Handle>`s) and all `RelationEdge`s
   re-render, every edge recomputing `getSmoothStepPath`. Neither custom component is
   wrapped in `memo`, which React Flow's own guidance calls for.
3. **Amplifier A — hover.** `setHovered` writes `hoveredId` into the store; `focus`
   (`editor.tsx:287-291`) depends on it, and `focus`/`hoveredEndpoints`/`dimActive`
   are inputs to both decorators. Dimming the board on hover is intended
   (design-00003 Tier A) — the defect is that an intended *visual* change is
   delivered by rebuilding React props for every element instead of restyling.
4. **Amplifier B — zoom (worse).** `zoom` is a subscription
   (`editor.tsx:203 useStore((s) => s.transform[2])`), so the whole `Canvas`
   re-renders on **every frame** of a gesture. `visibleTypes`
   (`editor.tsx:316 useMemo(() => new Set(typesForZoom(zoom, level)), [zoom, level])`)
   then produces a **new Set identity on every frame**, even though
   `typesForZoom`'s *contents* only change at a threshold. That invalidates
   `visibleNodes` → `decoratedNodes`, `visibleEdges` → `computeEdgeOffsets` →
   `decoratedEdges`: the entire chain re-runs per frame and re-renders every element,
   producing DOM that is usually **identical**. Measured: 1381ms of main-thread
   blocking for one gesture at 342 nodes, while only ~1 DOM update per element
   occurred — i.e. nearly all of it is wasted reconciliation.
5. **Side finding (independent waste)**: `useAutosave` (`editor.tsx:161`) subscribes
   to the *whole* store, so view-only changes enter the 400ms debounce and trigger a
   full `toModel` + `JSON.stringify` + three `localStorage` writes. Measured: six
   hovers with no model change → **18 `setItem` calls, 128 KB serialized**.
6. **True root cause**: view-only state (hover, focus, zoom band) is threaded through
   per-element React props, so a change that affects only appearance costs a full
   graph reconciliation. It is not an algorithmic bug in the layout/spread engine
   (a CPU profile is dominated by `jsxDEV`/`beginWork`/`HandleComponent`/
   `setValueForStyles`, with no project function on the list), not a paint bug
   (panning is smooth at every size), and not a React Flow limitation.

## Reproduction (test-first)

Both guards live in `web/e2e/editor.spec.ts` and run on a board built by replicating
`e2e/fixtures/model.json` 20× (160 nodes / 120 edges) inside the test, so no large
fixture enters the repo.

- *"hovering one element does not re-render every node on the board"* — **structural**:
  counts how many node elements one pointer-enter mutates. Failed at **160 of 160**
  (threshold: fewer than a quarter of the rendered nodes).
- *"a zoom gesture inside one semantic band does not stall a frame"* — **timing**,
  because a structural metric cannot see this half of the defect: the wasted
  re-render produces *identical* DOM, so mutation counts stay near zero while the
  main thread burns. The observable cost is frame length. Failed at **131ms** for the
  longest frame (threshold 60ms; a healthy in-band frame is ~8ms, so there is >2x
  headroom on both sides).

An earlier attempt at a structural zoom guard passed on the unfixed code — recorded
here because it is the trap: counting DOM mutations proves nothing about wasted
reconciliation.

Measured before the fix, in Chromium:

```
hover ONE node (53-node example) → 53 of 53 nodes + 56 edges mutated, one 84ms long task
settle latency per hover (median of 7), dev / production build:
     57n/ 70e     56ms / 17ms
    171n/210e    140ms / 47ms
    342n/420e    279ms / 87ms        ← linear in (nodes + edges)

wheel zoom, 10 ticks (dev): main-thread blocking / longest frame
     57n/ 70e     104ms /  102ms
    171n/210e     763ms /  153ms
    342n/420e    1381ms /  221ms
pan 300px, same board (control): 0ms blocking, 0 element updates
```

## Fix

Four changes, each independently verifiable:

1. **Stabilise the semantic-zoom band by value** (`editor.tsx`). `visibleTypes` is
   memoised on a primitive key derived from `typesForZoom(zoom, level)`, so a zoom
   frame that stays inside a band invalidates nothing downstream.
2. **Dim through one injected rule instead of per-element props** (`editor.tsx`). The
   board wrapper takes an `es-dim` / `es-dim-edges` class and a single `<style>` dims
   the layer and lifts the bright ids back out. Element ids come from the imported
   DSL, so they go through `CSS.escape` before entering a selector. `decoratedNodes`
   no longer depends on hover/focus at all.
3. **Only the emphasised edges get a new object** (`editor.tsx`). Relation colour and
   parallel-edge spread move into a `baseEdges` layer keyed on model + layout;
   `decoratedEdges` hands every un-emphasised edge back the identity it already had.
   `ElementNode` and `RelationEdge` are wrapped in `memo`, as React Flow's own
   guidance calls for. `RelationEdge` no longer decides its own dim state.
4. **`useAutosave` compares the persisted slice** (`editor.tsx`) before scheduling a
   save, so view-only changes never serialize the model.

A ref-based decoration cache was the first attempt at (3); `react-hooks/refs`
correctly rejected reading a ref during render, and the two-layer memo is both
lint-clean and simpler.

## Verification

**Resolved 2026-07-28.** Both guards fail on the unfixed board (160 of 160 nodes
touched; 131ms longest in-band frame) and pass after.

Before/after measured on the *same* boards, same machine, dev server — the fix was
stashed and restored between runs so nothing else differs:

| board | hover settle (median) | node DOM updates / hover | edge DOM updates / hover | longest zoom frame |
| --- | --- | --- | --- | --- |
| 56n / 42e | 54ms → **26ms** | 41 → **0** | 41 → **11** | 31ms → 35ms (already fine at this size) |
| 160n / 120e | 121ms → **40ms** | 115 → **0** | 97 → **11** | 132ms → **26ms** |
| 344n / 258e | 256ms → **70ms** | 148 → **0** | 123 → **12** | 211ms → **99ms** |

`localStorage` writes for six hovers with no model change, on the ride-hailing
example: **18 setItem calls / 128 KB serialized → 0**.

Visual behaviour is unchanged, and that is asserted rather than eyeballed: the
design-00003 tests that read computed opacity (`0.12` for a dimmed edge path, `<1`
for a dimmed node, `1` for a bright one) and the issue-00018 guard all pass against
the stylesheet-based dimming. 271 unit + 56 e2e green; lint and `tsc --noEmit` clean.

Remaining, not addressed here: both interactions are 3-5x cheaper but still grow
with board size. Hover now costs a browser restyle of every node (the injected rule)
plus one array allocation in `decoratedEdges`, instead of a React pass over the
graph. The 99ms zoom frame left at 344 nodes is largely *legitimate* work — that
gesture crosses a semantic-zoom threshold, so whole bands mount and unmount; the
in-band case is what the guard pins. If this becomes the next bottleneck the levers
are React Flow's `onlyRenderVisibleElements`, returning the same edge array when no
edge is emphasised, and cutting `ElementNode`'s 8 handles to 4 (the last interacts
with issue-00017's drag-direction fix and needs care).
