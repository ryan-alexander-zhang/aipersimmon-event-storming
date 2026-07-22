---
id: design-00006-discovery-surface
type: design
role: main
status: active
parent: spec-00002-discovery-mode
---

# Design: discovery surface and converge hand-off

> Technical design for [spec-00002](../spec/spec-00002-discovery-mode.md),
> implementing [prd-00002](../prd/prd-00002-complex-business-analysis.md) FR1
> within [decision-00004](../decision/decision-00004-discovery-mode-free-placement.md).
> Terms follow [CONTEXT.md](../../CONTEXT.md).

## 1. Principle

Discovery Mode is an **input funnel**, not a second editor. It holds a transient
**discovery wall** (unordered Domain Events at free x/y) that is completely
separate from the structured model. The structured board's invariant — position
= f(model), no persisted free positions (decision-00002) — is untouched: the
wall's coordinates never enter `nodes`, the DSL, or export. Converge is the only
bridge from wall to model.

This reuses three existing patterns rather than inventing new machinery:

- **Transient store slice** like `isolate`/`walk` (`store.ts:43-48`) — never
  serialized into the DSL.
- **React Flow canvas** — the same `<ReactFlow>` renders the wall, but fed a
  separate node set with free (uncontrolled) positions.
- **`addNode` global-order assignment** (`store.ts:166`) — converge just calls the
  existing add path once per wall event.

## 2. State

A new store slice (`store.ts`), transient in the isolate/walk sense but with its
`items` mirrored to local storage (§5):

```ts
interface DiscoveryItem { id: string; label: string; x: number; y: number }
interface DiscoveryState { active: boolean; items: DiscoveryItem[] }
```

Actions:

- `enterDiscovery()` / `exitDiscovery()` — `enterDiscovery` is a no-op unless
  `level === "big-picture"` (the Toolbar keeps the control unavailable elsewhere);
  a level switch away from Big Picture calls `exitDiscovery`.
- `addDiscoveryItem(x, y, label?)` — append an item at a free position.
- `moveDiscoveryItem(id, x, y)` — update coordinates (drag).
- `updateDiscoveryItem(id, label)` / `removeDiscoveryItem(id)`.
- `converge()` — see §4.

`items` carries no `order` and no `context`: those are structured-model concepts
assigned only at converge.

## 3. Surface (rendering)

When `discovery.active`, `editor.tsx` swaps its node/edge feed:

- **Nodes** = discovery items, rendered with the existing Domain Event node style,
  `draggable: true`, `position` read straight from `{x, y}` (no `computeLayout`).
- **Edges** = none. Relaxed grammar means no connecting surface, so
  `isValidConnection`/`connect` are simply not reachable in the mode.
- **Add**: a toolbar "+ Event" button drops a new sticky in a light left→right
  cascade (`addDiscoveryItem`); the modeller then drags it where they want.
- **Drag**: `onNodeDragStop` writes back through `moveDiscoveryItem` — the free x/y
  path, distinct from the structured board's drag-edits-`order` path
  (`editor.tsx:188`). Discovery drag never touches `setEventOrder`.
- Structured-board chrome (bands, context regions, timeline drag indicator) is
  hidden while the wall is active; a light "Discovery" affordance signals the mode.

The Discovery toggle and Converge button live in the Toolbar
(`toolbar.tsx`), next to the Level control, enabled only at Big Picture.

## 4. Converge

`converge()` is the single hand-off (us-00017):

1. Sort `items` by ascending `x` (ties broken by `id`) → left→right sequence.
2. For each item in that order, call the existing `addNode("domainEvent",
   undefined, { label })`. `addNode` assigns the **next global order**
   (`store.ts:166`), so the batch lands as a contiguous block appended after any
   existing events, in wall left→right order (us-00017-AC-2.1/2.2).
3. Clear `items`, set `active = false`, clear the discovery storage key.

Consequences: converged events are ordinary structured-board Domain Events —
Ungrouped, layout-positioned, no free coordinates (us-00017-FR-3/FR-4). There is
no reverse path to free coordinates, per decision-00004 clause 4. Empty wall →
converge is a no-op that just exits the mode (us-00017-AC-5.1).

## 5. Persistence

The wall must survive reload (us-00016-FR-6) **without** leaking into the DSL. A
storage key separate from the model:

- `persistence.ts`: `saveDiscovery(items)` / `loadDiscovery()` / `clearDiscovery()`
  under `STORAGE_KEY_DISCOVERY = "event-storming:discovery"`, storing a plain
  `{ items }` JSON (not DSL-validated; a corrupt entry is ignored and the wall
  starts empty).
- `editor.tsx`: an autosave effect writes `discovery.items` on change, mirroring
  the existing model-autosave effect. Load restores `items` on mount.
- The model autosave (`saveModel` → `exportJSON`) is **unchanged**; it never sees
  discovery items. This is what keeps decision-00004's FR1 invariant true by
  construction, not by convention.

## 6. Boundaries / non-goals

- No connecting, no other element types on the wall (Domain Events only,
  decision-00004 clause 2).
- No per-item converge or manual reordering dialog in v1 — one Converge action,
  order by position (decision-00004 clause 4).
- No context assignment during converge — always Ungrouped; reuse the existing
  `reassignContext` on the structured board afterward.
- Discovery is Big-Picture only; Process/Design stay fully structured.

## Links

- Spec: spec-00002-discovery-mode · Decision: decision-00004 (bounds),
  decision-00002 (structured-board invariant) · Plan: plan-00012-discovery-mode
