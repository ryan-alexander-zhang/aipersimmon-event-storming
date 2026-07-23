---
id: issue-00016-converge-button-unreadable-dark-on-dark
type: issue
role: main
status: resolved
parent: spec-00002-discovery-mode
---

# Converge button is unreadable — dark text on a dark fill

## Problem

In Discovery mode the **Converge** button renders as dark (near-black) text and icon
on a dark `zinc-800` fill, so the label is effectively invisible (user screenshot).
It should be a solid dark button with **white** text, like the "Capture snapshot"
button in the Versions panel.

## Context / trigger

Always, whenever the Converge button is visible: Big Picture level → Discover →
Converge appears in the toolbar.

## Root cause (first principles)

1. **Observed**: the Converge label/icon are dark on a dark fill. **Expected**: white
   label/icon on the dark fill.
2. **Mechanism**: `web/components/toolbar.tsx` builds the Converge className as
   `` `${btn} bg-zinc-800 text-white hover:bg-zinc-700` ``. The shared `btn` string
   already contains `text-zinc-700`, so the element carries **two** conflicting
   `text-*` utilities (`text-zinc-700` and `text-white`). Tailwind resolves such a
   conflict by **stylesheet order**, not class-attribute order — and `text-zinc-700`
   is emitted after `text-white`, so it wins. The text renders `zinc-700` (`#3f3f46`)
   on `bg-zinc-800` (`#27272a`).
3. **True root cause**: composing a base utility string that already sets a text
   colour with an inline override of the same property. It is not a dark-mode,
   contrast-token, or icon-inheritance bug — the override is simply never applied.

## Reproduction (test-first)

`web/e2e/editor.spec.ts` "the Converge button is legible: white text on the dark
fill [issue-00016]": at Big Picture enter Discover, then assert the Converge button's
computed `color` is white (`rgb(255, 255, 255)`). Before the fix the computed colour
is `rgb(63, 63, 70)` (zinc-700) and the assertion fails.

## Fix

`toolbar.tsx`: give Converge an explicit className that does not inherit the
`text-zinc-700` from `btn` — a self-contained dark-button string with `text-white`
only (mirroring the Versions "Capture snapshot" button).

## Verification

**Resolved 2026-07-23.** The repro test failed before the fix (computed colour
`lab(26.8 …)` = zinc-700) and passes after (`rgb(255, 255, 255)`). 245 unit + 46 e2e
green; lint clean. Real-browser: the Converge label and icon are white on the dark
fill and clearly legible.
