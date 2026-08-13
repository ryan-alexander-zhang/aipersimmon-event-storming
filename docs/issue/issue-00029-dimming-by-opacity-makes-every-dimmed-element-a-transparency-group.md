---
id: issue-00029-dimming-by-opacity-makes-every-dimmed-element-a-transparency-group
type: issue
role: main
status: resolved
parent: spec-00001-mvp-editor
---

# Dimming by opacity makes every dimmed element a transparency group, so a camera gesture stutters while a slice is being read

## Problem

On a large board, panning and zooming are smooth — until an element is selected (or
a Bounded Context focused). From then on, dragging the empty canvas and zooming
stutter badly, for as long as the highlight stands. The board looks correct
throughout; only the frame rate collapses.

## Context / Trigger

Reported against a 141-node / 222-edge model. Two earlier attempts fixed real but
unrelated costs and changed nothing the reporter could feel: per-event re-renders
([issue-00028](issue-00028-camera-and-hover-re-render-the-board-inside-a-committed-scope.md),
kept — it is genuine waste), and freezing the focus-edge flow during camera gestures
(a continuous animation on the single SVG layer that holds every edge, costing
~30ms/s of repaint at rest; measured, but dropped as a half-mitigation — the real
answer there would be a design change to flow only on edge hover). Both were
attributed to the symptom on the strength of local frame-drop numbers that later
proved unstable, which is what sent the first two rounds in the wrong direction.

With the local measurements unable to arbitrate, the diagnosis moved into the
reporter's own browser: temporary `?<name>=off` flags were added, each stripping one
layer of what a selection puts on screen, and the reporter judged the same drag by
feel.

| what was disabled | drawn content | alpha | felt |
| --- | --- | --- | --- |
| nothing (baseline) | full board | nodes + edges translucent | stutters |
| node dimming only | full board | edges translucent | stutters |
| the entire edge layer | edges not drawn at all | nodes translucent | stutters |
| node dimming **and** edge dimming | full board | none | smooth |
| all dimming | full board | none | smooth |
| dim rendered as colour (candidate fix) | full board | none | smooth |

## Root Cause (first principles)

1. **Observed**: the stutter tracks the presence of `opacity < 1`, not the amount of
   content. The last row draws exactly the same nodes, edges, sizes and positions as
   the first — the only difference is that the dim is a colour rather than an alpha —
   and it is smooth. **Expected**: a camera move re-rasterises a layer whose cost
   depends on what is drawn, not on how its colours were arrived at.
2. **Mechanism**: a CSS `opacity` below 1 makes the element a **transparency group**.
   The compositor must render that element and all of its descendants into a separate
   buffer and blend the buffer back with alpha — it cannot simply fold the alpha into
   the paint, because the group has to composite as a unit (a node carries 8 handles,
   an icon and its text). Dimming was applied per element:
   `.es-dim .react-flow__node{opacity:0.15}` over ~141 nodes and
   `.react-flow__edge-path{opacity:0.12}` over ~222 paths — several hundred
   transparency groups, live for as long as the highlight stands. A pan or zoom
   changes the viewport transform, so the layer is re-rasterised continuously, and
   every raster rebuilds and blends all of them. At rest the raster is cached, which
   is why a still board never felt slow.
3. **True root cause**: **a visual state was expressed as a compositing operation
   instead of as a colour.** "Dimmed" is a matter of what colour a sticky paints;
   implementing it as translucency bought a per-element compositing pass the design
   never asked for, and made the cost scale with the number of dimmed elements
   rather than with what is on screen.
   - This is also why the two earlier attempts missed: they optimised **JS** and
     **repaint** (a per-frame animation, per-event re-renders), while the bottleneck
     was in **rasterisation**. Both remain real inefficiencies and are still open.
   - It is also why single-variable ablation kept pointing nowhere: nodes and edges
     each held roughly half the transparency groups, so removing either half alone
     still left enough to blow the frame budget. Only the combination separated.

## Reproduction

`a dimmed board paints no translucent elements [issue-00029]` in
`e2e/editor.spec.ts`: commit a scope on the 160-node board, then assert that no
`.react-flow__node`, `.es-sticky` or `.react-flow__edge-path` computes to a partial
opacity, and that the dim is nevertheless on (most stickies do not paint their own
`--es-fill`). Deterministic — it reads computed styles, not milliseconds. Confirmed
failing on the previous implementation (`nodes: 157, paths: 118` translucent) and
passing after.

## Fix

Dim by repainting the element's own colours, muted, instead of making it translucent:

- `element-node.tsx` publishes the sticky's colours as custom properties
  (`--es-fill`, `--es-tint`) and tags the body `.es-sticky`.
- `editor.tsx` injects a rule that mutes every **out-of-scope** element and leaves
  the bright ones alone — the bright ids are excluded with `:not([data-id=…])`
  rather than given a restoring rule, so nothing has to put an inline colour back:
  - nodes: `background: color-mix(in srgb, var(--es-fill) 18%, #fff)`, muted text
    and tint border, and the handles hidden (each carries its own alpha, and they
    are an affordance for an element that is out of scope anyway);
  - edges: a flat `#d8d8dc` stroke with the arrowhead dropped (a coloured marker
    cannot be muted from CSS).
- The single injected stylesheet and its O(1) React cost (issue-00019) are unchanged;
  only what that stylesheet *says* changed.

The Context Map is left as it was: it dims a handful of context cards with opacity,
which is the same construct at a scale where it costs nothing.

## Verification

Same board, same scripted drag with an element selected, production builds,
compositor frames from a trace:

| build | frames dropped |
| --- | --- |
| before (alpha dim) | 6% — and 35% in the runs where the machine was under load |
| after (colour dim) | **0%** |

Local frame counts proved unstable across sessions (the same scenario measured
anywhere from 0% to 35%), so the decisive evidence is the reporter's own A/B on
their machine: every configuration without alpha felt smooth, every configuration
with it stuttered, at identical drawn content.

Gates: e2e **64 passed** (including the new guard), unit **281 passed**, `lint` and
`tsc --noEmit` clean.
