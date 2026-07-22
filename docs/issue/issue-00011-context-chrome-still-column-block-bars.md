---
id: issue-00011-context-chrome-still-column-block-bars
type: issue
role: main
status: resolved
parent: spec-00009-global-timeline-bounded-context-region
---

# Context chrome still renders as column-block bars, contradicting the global-timeline model

## Problem

After the global-timeline refactor (spec-00009 / decision-00005), Bounded Context
is an attribute/region on one shared timeline — but the board still draws each
context as a **spanning top bar over a column range** (the old column-group
chrome), plus a spanning **"Ungrouped"** bar and an empty context "parked" far to
the right. So the board looks unchanged from the per-context model: contexts read
as blocks/lanes, not as an attribute, and with only ungrouped events present
nothing on screen reflects the new model.

## Context / Trigger

Spotted on a live board (Big Picture): two Ungrouped Domain Events plus one empty
"Context 1" rendered exactly like the old layout — a wide "Ungrouped" bar on the
left and "Context 1" parked on the right. The events carry no tint (correct — they
are ungrouped), so there is no visible evidence of the global-timeline change.

## Root cause (first principles)

1. **Observed**: `board-chrome.tsx` positions a context header bar per context
   using `computeContextBoxes` (a column-range span) and a separate spanning
   "Ungrouped" bar; an empty context is parked after the timeline. **Expected**
   (decision-00005, tint-only v1): a context is shown by a sticky **tint** on the
   board and managed via a lightweight **legend**, not a spanning column bar;
   Ungrouped has no bar; an empty context does not occupy the canvas.
2. **Mechanism**: the model changed (order global, context = attribute) but the
   *chrome* was carried over unchanged — `board-chrome.tsx` still renders the
   viewport-tracking context header bars + Ungrouped bar (lines ~84–142), and
   `computeContextBoxes` was even extended to park empty contexts so those bars
   would not overlap.
3. **True root cause**: the context **chrome** was not migrated with the model. It
   is a completed-work gap in plan-00011 (P2.1 said "context region UI"; v1 chose
   tint-only, but the leftover header bars were never removed), not a model bug —
   the layout/order is correct.

## Reproduction (test-first)

`web/e2e/editor.spec.ts` "creates ungrouped Domain Events on the timeline, no
context bar or tint [issue-00006, issue-00011]": after adding an Ungrouped Domain
Event, assert **no** spanning "Ungrouped" text bar is shown and the event carries
no `data-context-tint`. Red before the fix (the "Ungrouped" bar is visible); green
after (bar removed, ungrouped = no tint).

## Fix

- Extract `contextTint` into `web/lib/eventstorming/context-color.ts` (shared by
  the sticky and the legend).
- `board-chrome.tsx`: replace the spanning context header bars and the Ungrouped
  bar with a **context legend** (chips: colour swatch + name + add-event +
  remove); on the board, context is identified by the sticky tint stripe.
  Ungrouped events get no chip/bar (added via the palette); empty contexts show
  only a legend chip, never a parked canvas bar.
- Stop consuming `computeContextBoxes` in the chrome (kept for the deferred
  region rendering in spec-00004).

## Verification

**Resolved 2026-07-22.** `contextTint` extracted to
`web/lib/eventstorming/context-color.ts`; `board-chrome.tsx` now renders a context
**legend** (chips: colour + name + add-event + remove) with no spanning bars and
no Ungrouped bar; the sticky tint stripe identifies context on the board.

- Reproduction test green: e2e "creates ungrouped Domain Events on the timeline —
  no context bar or tint" (no "Ungrouped" text; ungrouped events carry no
  `data-context-tint`).
- Gate: unit **172 passed**, e2e **32 passed**, `tsc`/`lint`/`build` clean.
- Real-browser (agent-browser): built two contexts and three events interleaved
  as Context 1 / Context 2 / Context 1 → they sit on one global timeline in order,
  each with its context tint stripe (`#ec4899`, `#a855f7`, `#ec4899`); the top
  shows two legend chips, no column-block bars, no Ungrouped bar. Confirmed by
  screenshot.
