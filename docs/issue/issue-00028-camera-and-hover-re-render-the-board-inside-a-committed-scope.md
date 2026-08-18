---
id: issue-00028-camera-and-hover-re-render-the-board-inside-a-committed-scope
type: issue
role: main
status: resolved
parent: spec-00001-mvp-editor
---

# A wheel tick and every node the pointer crosses re-render the whole board

## Problem

Two view-only interactions cost work proportional to the whole board, on a picture
that does not change:

- every tick of a wheel gesture re-renders `Canvas` — measured at **5.1ms of
  JavaScript per tick** on a 160-node board;
- inside a **committed scope** (a selected element or a focused Bounded Context),
  every node the pointer crosses re-renders the board and re-processes all 222
  edges — **5.8ms per hover-out** — even though design-00003 Tier A defines that
  hover as changing nothing while a scope stands.

A pan sweeps the board under the pointer, so the second one fires continuously
during exactly the gesture that can least afford it.

## Context / Trigger

Found while investigating a reported stutter, from a Chrome DevTools trace recorded
on the reporter's own machine (13.9s: one drag, some wheel zooming, ordinary pointer
movement):

| DOM event | count | avg main-thread cost | total |
| --- | --- | --- | --- |
| `mouseout` | 119 | **7.2ms** | 861ms |
| `wheel` | 40 | **9.8ms** | 393ms |
| `mousemove` (the drag itself) | 334 | 0.84ms | 280ms |

These costs are real. They were **not** the cause of the reported stutter — that was
[issue-00029](issue-00029-dimming-by-opacity-makes-every-dimmed-element-a-transparency-group.md),
a rasterisation cost, while these are JS and repaint costs — and applying this fix
alone changed nothing the reporter could feel. Claiming causation here was a
diagnostic error: the frame-drop percentages used to support it were unstable across
sessions on the measuring machine. The per-event costs above are stable, reproducible
and independent of that symptom, so they are fixed on their own terms.

## Root Cause (first principles)

1. **Observed**: a wheel tick costs ~5ms of JavaScript, and a node passing out from
   under the pointer costs ~6ms, on a board whose picture does not change.
   **Expected**: a camera move re-renders nothing, and a hover that cannot change
   what is highlighted re-renders nothing.
2. **Mechanism** — two independent paths into the same re-render:
   - **Zoom**: `Canvas` subscribed to the raw zoom (`useStore((s) => s.transform[2])`)
     purely to derive the semantic-zoom band. Zoom changes on *every* tick, so the
     whole board component re-rendered per tick for a band that only changes when it
     crosses a threshold.
   - **Hover**: `onNodeMouseEnter/Leave` wrote `hoveredId` unconditionally, and
     `focus` listed `hoveredId` among its dependencies. Inside a committed scope the
     result is identical, but the write still re-rendered `Canvas`, the new `focus`
     identity still rebuilt the edge decoration chain, and React Flow still
     re-processed all 222 edges (`addConnectionToLookup`, `EdgeWrapper` — visible in
     the sampled profile).
3. **True root cause**: **view-derived state read at a finer grain than the view
   actually uses it.** The board needs the zoom *band*, not the zoom; it needs the
   hovered node *only outside a committed scope*. Subscribing to the raw value turned
   a continuous input stream into a stream of whole-board re-renders.

## Reproduction

Two regression guards in `e2e/editor.spec.ts`, both confirmed failing before the fix
and passing after. They assert **cost per event**, not frame length: this is a few
milliseconds on every tick, which never shows up as one long frame — the existing
frame-length guards stayed green throughout.

| guard | before | after | threshold |
| --- | --- | --- | --- |
| `a wheel zoom does not re-render the board on every tick` | 5.1ms/tick | 1.8ms/tick | < 3ms (**superseded**, see below) |
| `hover inside a committed scope costs nothing` | 5.8ms/hover-out | 0.24ms/hover-out | < 2ms |

> **The wheel guard's threshold was rewritten by
> [issue-00038](issue-00038-a-per-event-budget-in-milliseconds-cannot-hold-across-machines.md).**
> The numbers above are this machine's; an absolute millisecond budget cannot separate the
> two states on another one — 5.1ms/tick *before* the fix here is lower than the cost
> *after* it on a slower machine. The guard now compares the wheel tick against a
> board-free event measured in the same trace (`< 8x`), which holds anywhere. The
> measurements above stand as the record of the original fix.

Both run on the existing 160-node synthetic board via `openLargeBoard` and read
`EventDispatch` durations from a CDP `devtools.timeline` trace.

## Fix

`components/editor.tsx`, two changes, no behaviour the design specifies is lost:

- **Subscribe to the band, not the zoom**:
  `useStore((s) => typesForZoom(s.transform[2], level).join("|"))`. The selector
  returns the same string for every tick inside a band, so the store skips the
  re-render entirely. Wheel ticks now cost **0** `Canvas` renders (was one per tick).
- **Do not record a hover that nothing reads**: `hoverPreview` is `null` inside a
  committed scope and is what `focus` depends on, and `onNodeMouseEnter` writes
  `null` rather than the node id while a scope is committed. `hoveredId` has exactly
  one reader (`hoverPreview`), which ignores it there.
  - Deliberate consequence: while a scope stands the hovered node is not tracked, so
    clearing the scope starts the neutral preview from the *next* pointer move rather
    than resurrecting the last node the pointer happened to be over. This is the
    sticky-scope rule of design-00003 read strictly, and is if anything less stale.

## Verification

| scenario (with a selection) | before | after |
| --- | --- | --- |
| wheel zoom — JS in wheel handlers | 193ms | **46ms** |
| pointer sweeping 12 nodes ×3 — JS in `mouseout` | 320ms | **15ms** |
| wheel tick — `Canvas` renders | 1 per tick | **0** |
| node hover inside a scope — `Canvas` renders | 2 per node | **0** |

Gates: e2e **67 passed** (including both guards), unit **281 passed**, `lint` and
`tsc --noEmit` clean.
