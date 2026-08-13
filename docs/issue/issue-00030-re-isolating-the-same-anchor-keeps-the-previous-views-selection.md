---
id: issue-00030-re-isolating-the-same-anchor-keeps-the-previous-views-selection
type: issue
role: main
status: resolved
parent: issue-00025-isolate-exit-recentres-on-the-anchor-not-what-was-read
---

# Re-isolating the same anchor leaves the camera on the previous view's selection

## Problem

Leaving Isolate lands on the element that was read inside the view, else on the
anchor (issue-00025). The fallback silently stopped applying to a *second* reading of
the same view: select an element, isolate it, leave without touching anything else,
and the camera stayed where the *previous* Isolate session had left it instead of
recentring on the element just isolated. On `examples/big.json` the freshly isolated
anchor ended up **3685px** off screen centre.

It reads exactly like "Isolate does not focus the node I clicked", and looks
intermittent for the same reason issue-00025 did: it only appears once some *earlier*
view of that same anchor had another element read inside it.

## Context / Trigger

Reported as "click a node, open Isolate, then click empty canvas without selecting
anything — it does not focus the node I clicked; only clicking a node first and then
clicking empty focuses it." The same defect answers the keyboard form of the report
(`i` to enter, `i` to leave), since both exits share one refit.

Measured first: the plain enter/leave path is correct on `fixtures/model.json` and on
`examples/big.json` (anchor centred at 0px), for both exits, and stays centred 3s
later. That is what pointed at a second session on an already-read view.

## Root Cause (first principles)

1. **Observed**: leaving a view with nothing read inside it recentres on an element
   from an earlier view. **Expected**: it recentres on that view's own anchor.
2. **Mechanism**: the exit target (`exitRef`,
   [`editor.tsx`](../../web/components/editor.tsx)) is reset when
   `exitRef.current?.key !== isoKey`, and `isoKey` is
   `` `${anchor.kind}:${anchor.id}|${direction}|${depth}` ``. Re-isolating the same
   anchor at the same direction and depth reproduces that string exactly, so the guard
   read "same view, keep going" and `selection` — the element read the previous time —
   survived into the new session. The refit prefers `selection` over the anchor, so it
   flew to the stale element.
3. **True root cause**: **`isoKey` identifies a view, and it was used to bound a
   reading.** They coincide only while each view is entered once; the state that has to
   be forgotten belongs to the enter/leave cycle, which no key derived from the view's
   parameters can distinguish. Not a race with the relayout, not `getNode` missing the
   anchor, not the new `i` binding: the same leak is reachable from the panel's Off/On
   and the clearing click, and the first session of any view has always been correct.

## Reproduction

Regression spec `e2e/editor.spec.ts` (issue-00030) on `fixtures/model.json`: isolate
`e1` (downstream, depth 2), click `rm1` inside the view, leave; then select `e1`
again, isolate, and leave without reading anything.

- Before: `e1` **264px** off centre — `rm1` still held the camera.
- After: `e1` **< 60px**, the view's own anchor.

Live on `examples/big.json`, anchor `invc-e-dunning`: before, the second session left
the anchor at **3685px** off centre; after, **0px**.

## Fix

`editor.tsx`: track whether the previous render was inside a view (`openRef`) and
reset the exit target whenever a view is *entered*, not only when its key changes.
Clearing happens on the entering render, never on the exit one — the refit still has to
read what the closing session recorded.

Behaviour inside a session is unchanged: the last element read still wins
(issue-00025), and a view with nothing read still lands on its anchor (issue-00021).

## Verification

- Regression spec (issue-00030) fails before the fix (264px) and passes after; the
  issue-00021 and issue-00025 specs still pass unchanged.
- Live `examples/big.json`: 3685px → 0px on the second session, for both the clearing
  click and the `i` exit.
- Gates: e2e **68 passed**, unit **281 passed**, `tsc` and `lint` clean. The one
  failing e2e (`issue-00028` wheel-zoom render budget) fails identically on `main`
  without this change.
