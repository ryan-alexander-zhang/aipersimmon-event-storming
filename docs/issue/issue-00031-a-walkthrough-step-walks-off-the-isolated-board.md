---
id: issue-00031-a-walkthrough-step-walks-off-the-isolated-board
type: issue
role: main
status: resolved
parent: spec-00005-narrative-walkthrough
---

# A walkthrough step walks off the isolated board

## Problem

With Isolate on, a Walkthrough steps to Domain Events the isolated board does not
render. Measured on four unconnected events, Isolate anchored on the first, then
Walk started and stepped once: the overlay reads **`Beta` — 2 / 4** and the
Inspector reads `Beta`, while the board renders **only `Alpha`** — and paints it
with the Visited fill, so the one sticky on screen says "already walked" while the
overlay says "current". No Step Ring is anywhere, because the node it keys on is
not in the DOM. Three of the four steps are dead steps.

Reachable from either direction: the Inspector's Isolate On/Off is live during a
walkthrough, the `i` key only bails for Discovery / Context Map / Compare
([`editor.tsx:325`](../../web/components/editor.tsx)), and `startWalkthrough`
does not clear Isolate.

## Context / Trigger

Found while answering "what happens in walkthrough mode if Isolate is on?" after
[us-00028](../us/us-00028-walkthrough-step-legibility.md) landed. The empty half
of it predates us-00028 — the cursor could always leave the rendered set, and
`dimActive` already dropped the slice highlight while isolating. us-00028 is what
made it *misleading* instead of merely blank.

## Root Cause (first principles)

1. **Observed**: a step names an event the board does not show. **Expected**: a
   step shows the event it names.
2. **Mechanism**: the cursor's order is
   `timelineOrder(get().nodes)` — the whole model
   ([`store.ts:297-306`](../../web/lib/store/store.ts)) — while the board renders
   `computeNeighborhood(anchor, …)`
   ([`editor.tsx:376-388`](../../web/components/editor.tsx)). Isolate's anchor is
   pinned on purpose (issue-00024: selecting inside the view must not re-frame
   it), so it never follows the cursor. The two sets are unrelated, and the cursor
   leaves the rendered one at the first step out of the anchor's neighbourhood.
   Two existing behaviours turn that from empty into wrong: `dimActive =
   focus.active && !isoNodeIds` (`editor.tsx:447`) drops the slice highlight
   whenever Isolate is on, so nothing marks the step; and the Visited fill keys on
   `data-id` with no dim scope, so a walked event that survives inside the
   neighbourhood is the only thing painted.
3. **True root cause**: **the Walkthrough's cursor and Isolate's anchor are two
   independent pointers into the same board.** Neither is wrong alone; nothing
   relates them. Not the Visited fill — that is a symptom, and it only exposed a
   failure that was already there. Not the camera: `fitView` on an id that is not
   rendered is the same divergence seen from the viewport. Not spec-00005's
   decision to reuse focus/dim.

## Fix

**The combination is removed rather than repaired**: the Walkthrough carries its
own Reading Scope ([us-00029](../us/us-00029-walkthrough-reading-scope.md),
[plan-00021](../plan/plan-00021-walkthrough-reading-scope.md)), so nothing needs
to compose two pointers into one board.

- Every Domain Event stays on the board, in place; the Current Step's
  neighbourhood (`both`, depth = the scope) is shown and everything else hidden.
  The cursor cannot step off a board that always holds the whole timeline.
- `startWalkthrough` leaves Isolate, and Isolate is unavailable while walking —
  the same gate the `i` key already applies inside Discovery / Context Map /
  Compare. Isolate's own semantics, including the pinned anchor (issue-024), are
  untouched.

An earlier fix in this same working session made Isolate's anchor *follow* the
cursor instead. It worked and its tests passed, but it kept the two modes
composed: the isolated board still had no timeline spine, the Visited / Upcoming
states were still mostly unrendered, a Bounded-Context anchor was silently
converted, and the camera had to be handed between two owners. It was reverted
unshipped in favour of the separation above.

## Reproduction

Written before the fix and kept as the regression guard:

- unit `store.test.ts` "starting a walkthrough leaves Isolate [issue-00031,
  us-00029-AC-5.1]" — Isolate active and anchored, then `startWalkthrough`:
  inactive with no anchor. Before, both survived and the two modes overlapped.
- e2e `editor.spec.ts` "a walkthrough keeps the whole timeline and shows only the
  current slice [us-00029-AC-1.1/3.1]" — four events each with a Command: all four
  events rendered, only the current event's Command shown. Before the fix, with
  Isolate on the board rendered one event and the overlay named another.

## Verification

Recorded in
[record-00021](../record/record-00021-walkthrough-reading-scope-acceptance.md)
with the rest of plan-00021's acceptance evidence.
