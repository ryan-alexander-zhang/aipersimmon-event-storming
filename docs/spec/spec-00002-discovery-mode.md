---
id: spec-00002-discovery-mode
type: spec
role: main
status: active
parent: prd-00002-complex-business-analysis
---

# Spec: discovery mode (chaotic exploration → converge)

> The shippable capability: at **Big Picture**, freely place unordered Domain
> Events on a transient **discovery wall** (relaxed grammar, free positions never
> persisted into the model), then a **Converge** action assigns each a global
> timeline `order` and hands it to the structured board. Delivers
> [prd-00002](../prd/prd-00002-complex-business-analysis.md) FR1 within the bounds
> fixed by [decision-00004](../decision/decision-00004-discovery-mode-free-placement.md).

## 1. Context

Real Event Storming begins with divergence — dumping hundreds of unordered Domain
Events on a wall before order or causality is known — then progressively enforcing
a timeline. Phase 1's board forbids free positioning and enforces grammar from the
first sticky (decision-00002), which suppresses that mess. decision-00004 narrows
decision-00002 to admit a bounded free-placement funnel at Big Picture only.

This spec builds on the post-refactor model
([decision-00005](../decision/decision-00005-global-timeline-bc-as-region.md)):
`order` is a single **global** timeline index and Bounded Context is an
**attribute** (Ungrouped is a valid state). So Converge assigns a global `order`
and leaves events Ungrouped — no per-context ordering, no forced context.

New CONTEXT.md terms **Discovery Mode** and **Converge** are added **as part of
this spec's implementation** (plan-00012), when the code lands — not before, to
avoid a glossary-vs-code gap (same policy as spec-00009).

## 2. User Stories

| Story | Doc | Status | Summary |
| --- | --- | --- | --- |
| US16 | [us-00016-discovery-free-placement](../us/us-00016-discovery-free-placement.md) | active | Enter Discovery Mode at Big Picture; drop/drag/rename/delete unordered events on a transient wall that survives reload but never enters the DSL |
| US17 | [us-00017-converge-to-structured-board](../us/us-00017-converge-to-structured-board.md) | active | One Converge action: order events by left→right position, create Ungrouped structured Domain Events, clear the wall |

## 3. Cross-cutting requirements

- **spec-00002-XFR-1** (Ubiquitous) The system shall keep the discovery wall
  (events + free positions) entirely outside the model DSL: it is persisted under a
  storage key separate from the model and appears in no export or import.
- **spec-00002-XFR-2** (Ubiquitous) The system shall confine Discovery Mode to Big
  Picture; Process and Design levels remain fully structured with grammar enforced.

### Acceptance (XAC)

- **spec-00002-XAC-1.1** (spec-00002-XFR-1)
  Given a discovery wall exists
  When the model is exported and re-imported
  Then the round-tripped DSL contains no discovery event and no free position
- **spec-00002-XAC-2.1** (spec-00002-XFR-2)
  Given Discovery Mode is off
  When the Modeler is at Process or Design level
  Then no Discovery control is available and grammar validation stays active

## 4. Technical Design

Full design in [design-00006](../design/design-00006-discovery-surface.md)
(discovery surface, converge hand-off, separate persistence). Sketch:

- **Store** (`lib/store/store.ts`): a transient `discovery: { active, items }` slice
  (isolate/walk pattern) with `enterDiscovery`/`exitDiscovery` (Big-Picture-guarded),
  `addDiscoveryItem`/`moveDiscoveryItem`/`updateDiscoveryItem`/`removeDiscoveryItem`,
  and `converge()`. `items` carry `{id, label, x, y}` — no `order`, no `context`.
- **Converge** (`converge()`): sort `items` by ascending `x`; for each, call the
  existing `addNode("domainEvent")` (which assigns the next global `order`,
  `store.ts:166`); then clear the wall and exit the mode. Appends a contiguous
  ordered block after existing events, in wall left→right order.
- **Surface** (`components/editor.tsx`): when `discovery.active`, feed React Flow
  the discovery items as freely-draggable Domain-Event nodes at their `{x, y}`
  (bypassing `computeLayout`); drag writes back `x/y`, never `order`; no edges, no
  `isValidConnection`. Structured chrome hidden.
- **Toolbar** (`components/toolbar.tsx`): Discovery toggle + Converge button next to
  the Level control, enabled only at Big Picture.
- **Persistence** (`lib/store/persistence.ts`): `saveDiscovery`/`loadDiscovery`/
  `clearDiscovery` under `event-storming:discovery`, wired to an autosave effect in
  `editor.tsx`. `saveModel`/`exportJSON` untouched → FR1 invariant holds by
  construction.
- **DSL / schema**: **unchanged**. No new version, no migration — discovery never
  touches the model shape (this is the whole point of decision-00004).

## 5. Error handling

- Empty wall → Converge is a no-op that just exits the mode (us-00017-AC-5.1).
- Corrupt/stale discovery storage entry → ignored on load; the wall starts empty
  (same best-effort posture as model autosave).
- Level switch away from Big Picture while active → exit Discovery Mode; the wall
  (if non-empty) stays in storage for re-entry.

## Links

- PRD: prd-00002 (FR1) · Decision: decision-00004 (bounds), decision-00002 /
  decision-00005 (invariants) · Design: design-00006 · US: us-00016, us-00017 ·
  Plan: [plan-00012-discovery-mode](../plan/plan-00012-discovery-mode.md)
