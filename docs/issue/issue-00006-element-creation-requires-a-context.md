---
id: issue-00006-element-creation-requires-a-context
type: issue
role: main
status: resolved
parent: plan-00002-structured-board
---

# You cannot create any element until a Bounded Context exists

## Problem

On a fresh, empty board there is no way to place any element. The only affordance
that creates the first ("root") element is the "+ Event" button rendered inside a
Bounded Context header; every other element is grown from an already-selected node
via the property panel. With zero contexts there are no headers, so there is no
create button anywhere — the user must create a Bounded Context first.

This inverts the Event Storming workshop (events are explored first; bounded
contexts are drawn *later*, around the clusters that emerge) and contradicts the
data model, which already treats context membership as optional.

## Context / Trigger

Found while reviewing the creation flow. Reproduce in the running app: `New` to
empty the board, then look for any way to add a Domain Event / Actor / Command —
the toolbar offers only "Add context", the canvas has no palette, and the property
panel's empty-state hint even points at a context header that does not exist:

> "Select an element to edit it, or add a Domain Event from a context header to
> start a slice." — [`property-panel.tsx:71`](../../web/components/property-panel.tsx)

## Root Cause (first principles)

1. **Observed**: an empty board (no contexts) exposes no element-creation control;
   the user is forced to create a Bounded Context before any element.
   **Expected**: the user can start by placing a Domain Event, and group elements
   into Bounded Contexts later (or never) — contexts are an optional late grouping.

2. **Mechanism**: the only context-independent creation entry, `+ Event`, is
   rendered *inside* the `contexts.map(...)` loop —
   [`board-chrome.tsx:78-116`](../../web/components/board-chrome.tsx), button at
   `:97-104` calling `addNode("domainEvent", ctxId)`. The toolbar offers only
   "Add context" ([`toolbar.tsx:106`](../../web/components/toolbar.tsx)); the editor
   canvas has no drag/drop palette (`nodesDraggable={false}`); and all other element
   types are created only by the property panel's slice actions, which require an
   already-selected node ([`property-panel.tsx:68,81-89`](../../web/components/property-panel.tsx)).
   No creation path exists that does not depend on a context already existing.

3. **True root cause**: element creation is coupled to context existence **in the
   UI only**. The data model does not require it — `nodeSchema.context` is
   `z.string().optional()` with the comment "optional for global actors/systems"
   ([`schema.ts:28-29`](../../web/lib/dsl/schema.ts)) — and the layout engine already
   folds context-less nodes into a single synthetic column: `ctxOf` and the event
   bucket both fall back to `"__none"` for a nullish context, and any referenced-but-
   undeclared context still reserves a column
   ([`layout.ts:41,52-53,94,100`](../../web/lib/layout/layout.ts)). So the fix is a
   missing UI entry point plus a soft group for the context-less bucket — **not** a
   schema or layout change. It is not that orphan nodes are unrepresentable (they
   are); it is that nothing in the UI can create the first one.

## Reproduction (test-first)

`web/e2e/editor.spec.ts` (issue-00006): starting from an empty board (no
`Add context`), add a Domain Event and assert one `domainEvent` node appears under
an "Ungrouped" soft group; add a second and assert both share one column group.
Fails before the fix because no context-independent create control exists (the
"Add event" toolbar button and the "Ungrouped" header are absent).

## Fix (direction)

Introduce **Ungrouped** as the context-less state (an element whose `context` is
absent), keeping Bounded Context an optional later grouping. `undefined` is the
single canonical representation (the layout already buckets it, and the DSL already
omits an absent context on export — [`serialize.ts:32,65`](../../web/lib/dsl/serialize.ts)).

- [`toolbar.tsx`](../../web/components/toolbar.tsx): add an "Add event" button that
  calls `addNode("domainEvent")` (no context) and selects the new node.
- [`board-chrome.tsx`](../../web/components/board-chrome.tsx): render a static
  "Ungrouped" header (with a "+ Event" button, no rename/remove) for the layout box
  whose id is not a declared context — i.e. the context-less bucket — appearing only
  when it has members.
- [`store.ts`](../../web/lib/store/store.ts): make `addNode`'s `context` optional;
  `addHotspot` inherits the target's context as-is; `reassignContext` coerces an
  empty selection back to "no context" so grouping is bidirectional.
- [`property-panel.tsx`](../../web/components/property-panel.tsx): slice children
  inherit the selected node's context verbatim (so an Ungrouped slice stays
  Ungrouped); the Bounded-context dropdown gains an "Ungrouped" option; empty-state
  hint updated to point at the new entry point.

Scope guard: this does **not** add label filtering or any grouping beyond the single
Ungrouped bucket.

## Verification

- Regression (reproduction) test `web/e2e/editor.spec.ts` (issue-00006): from an
  empty board, "Add event" creates a Domain Event under an "Ungrouped" header; a
  second event joins the same group and takes the next timeline slot. Failed before
  the fix (no "Add event" button), passes after.
- Store regression tests `web/lib/store/store.test.ts` (issue-00006): `addNode`
  without a context yields `context: undefined` with an independent timeline;
  `reassignContext(node, "")` returns a node to Ungrouped. New behaviour locked in.
- Full suite green: `bun run test` 106 passed; `bun run test:e2e` 21 passed;
  `tsc --noEmit`, `bun run lint`, `bun run build` all clean.
- Live app (empty board): the toolbar "Add event" places a Domain Event in the
  Domain Events band under a dashed italic "Ungrouped" soft header (no rename/remove);
  a second event lands in the next column of the same group. Assigning a context
  then selecting it from the property-panel dropdown moves the node into that
  context's column; the "Ungrouped" option moves it back. Confirmed by screenshot.
