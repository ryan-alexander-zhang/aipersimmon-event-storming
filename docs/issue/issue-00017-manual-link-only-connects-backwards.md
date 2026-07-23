---
id: issue-00017-manual-link-only-connects-backwards
type: issue
role: main
status: resolved
parent: spec-00001-mvp-editor
---

# A manual relation link can only be drawn backwards (drag from the arrow head)

## Problem

On the timeline board (us-00002), a manual link between two elements can only be
created by dragging from the **downstream** node (the arrow head) back to the
**upstream** node. Dragging in the natural direction — from the source to the
target, the way the arrow points — is silently rejected and creates no edge.

Reported example: with just a Command and a Domain Event, dragging Command →
Domain Event does nothing, but dragging Domain Event → Command creates the edge —
and the resulting arrow still (correctly) points Command → Domain Event. The
interaction is backwards relative to the semantics.

## Context / trigger

Reproduces for every manual link, whichever element pair. Manual connections are
the supported path for cross-context / ambiguous relations (us-00002, re-scoped by
decision-00002). Slice-action auto-links are unaffected — they set handle ids
directly and never depend on drag direction.

## Root cause (first principles)

1. **Observed**: dragging from the source element to the target element is
   rejected; only the reverse drag creates the edge (arrow direction is correct
   either way). **Expected**: dragging from the source to the target — arrow tail
   to arrow head — creates the edge.
2. **Mechanism**: `components/nodes/element-node.tsx:45-54` renders, on every side
   of a node, a `source` **and** a `target` handle at the same position. They are
   declared source-first, target-second (`s-bottom` then `t-bottom`, …). The two
   handles fully overlap, share `HANDLE_STYLE`, and set no `zIndex`, so the
   later-painted **target** handle sits on top and captures the pointer on
   mouse-down. React Flow (default `ConnectionMode.Strict`) therefore begins every
   drag as a *target-anchored* connection: the grabbed node becomes the edge
   **target**, and the node dropped on becomes the source. Dragging Command → Event
   thus yields `source = Event, target = Command`, which matches no rule in
   `CONNECTION_RULES` (`lib/eventstorming/relations.ts`) and is rejected; dragging
   Event → Command yields `source = Command, target = Event` = `produces`, valid.
3. **True root cause**: on drag-start the **target** handle always wins the overlap,
   so a drag can only ever *begin* an incoming connection. It is not a rule-table
   bug (the directed rules are correct) and not a validation bug
   (`resolveRelation` is correct) — it is a handle stacking / hit-order defect that
   inverts which end of the link the drag anchors.

## Reproduction (test-first)

`web/e2e/editor.spec.ts` adds a test that loads a fixture with one Command and one
Domain Event (no edge) and drags from the Command's bottom to the Domain Event's
top. It expects one edge afterwards. Before the fix the drag anchors the Command as
the target, produces the invalid `Event → Command`, and no edge is created — the
test fails (0 edges). (Empirically confirmed: forward drag → 0 edges, reverse drag
→ 1 edge.)

## Fix

`components/nodes/element-node.tsx`: lift the **source** handles above the target
handles (`zIndex`) so a drag from a node begins an *outgoing* (source) connection.
A drag from the source element to the target element now yields `source → target`,
which the rule table validates and accepts. Drag direction now matches arrow
direction. Slice-action auto-links are untouched (they pass explicit handle ids).

## Verification

**Resolved 2026-07-23.** `web/e2e/editor.spec.ts` issue-00017 regression test:
dragging Command → Domain Event now creates exactly one edge (failed with 0 edges
before the fix). 257 unit + 51 e2e green; lint and build clean. The e2e runs in a
real Chromium browser, so the interaction is confirmed end-to-end: a manual link
now follows the arrow direction (drag arrow tail → arrow head). Slice-action
auto-links (explicit handle ids) unchanged.
