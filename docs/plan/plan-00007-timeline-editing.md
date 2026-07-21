---
id: plan-00007-timeline-editing
type: plan
role: main
status: resolved
parent: spec-00001-mvp-editor
---

# Plan: timeline editing by direct manipulation

Implements [us-00010-adjust-timeline](../us/us-00010-adjust-timeline.md) per
[design-00004](../design/design-00004-timeline-editing.md): let the Modeler
adjust a Domain Event's timeline place by dragging (insert between slots), drop
onto another to make concurrent, split out, move to start/end, and keyboard
arrows — within one context. Terms follow [CONTEXT.md](../../CONTEXT.md).

The layout engine is unchanged: it already renders any set of `order` values
(design-00004 §2). Work is all in the order model + interaction. Two phases: the
**model core** (pure, unit-tested) lands first and is independently correct; the
**interaction UI** follows.

## Phase 1 — model core

| # | Task | Verify |
|---|---|---|
| P1.1 | `lib/store/`: add pure `normalizeContextOrders(nodes, ctx)` — remap a context's distinct Domain Event orders to contiguous `0..k-1`, preserving concurrency groups (equal stays equal). | unit: gaps collapse; groups preserved; non-event nodes untouched |
| P1.2 | `store.ts`: `setEventOrder(eventId, order)` — write the (fractional-allowed) order, normalize that context, then `laidOut()`. Replace `reorderEvent` internals. | unit: insert-between → A,C,B; before-first / after-last; onto (concurrency, shared order); split-out → own slot (us-00010-AC-1.1/1.2/2.1/3.1) |
| P1.3 | `store.ts`: `nudgeEvent(eventId, dir)` (column-aware one-slot move) + move-to-start/end; replace the adjacent-swap `moveEvent`. All funnel through `setEventOrder`. | unit: A,B,C press-left on B → B,A,C; move-to-start on C → C,A,B (us-00010-AC-4.1/5.1) |
| P1.4 | Update `store.test.ts` for the new actions; drop tests tied to the old swap. | `bun run test` green; `lib/**` coverage ≥90% |

## Phase 2 — interaction UI

| # | Task | Verify |
|---|---|---|
| P2.1 | `editor.tsx`: set `draggable: true` on Domain Event nodes only (keep global `nodesDraggable={false}`); wire `onNodeDragStart/Drag/Stop`; ignore pointer-y; Escape and drop-outside-context cancel with no write. | run: only Domain Events drag; other types stay locked; Esc restores position (us-00010-AC-7.1) |
| P2.2 | Hit-test util: pointer-x → `{kind:'gap',index}` \| `{kind:'onto',order}` using per-context column geometry (reuse `computeContextBoxes` + `COL_W`); translate target → order per design-00004 §3 and call `setEventOrder`. | unit on the pure hit-test → target mapping; run: gap vs center resolve correctly |
| P2.3 | Drop indicator: insertion marker at a gap boundary; slot highlight for an onto/concurrency target, shown during drag. | run: dragging shows the right affordance in each zone (us-00010-AC-6.1) |
| P2.4 | `property-panel.tsx`: chevrons now call `nudgeEvent`; add move-to-start/end; wire Left/Right arrows when an event is selected and the canvas is focused. | run: buttons + arrows reorder a selected event |
| P2.5 | `e2e/editor.spec.ts`: move-to-start button + arrow-key paths (same store commit as drag) and a drag-enabled-only assertion. RF v12 pointer-drag isn't Playwright-simulable (design-00004 §9), so the drag itself is covered by store/unit tests + real-browser verification, not e2e. | `bun run test:e2e` green; drag confirmed in a real browser |

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- Phase 1 + Phase 2 tasks done; `tsc`, `bun run lint`, `bun run build` clean;
  unit + e2e green; `lib/**` coverage ≥90%.
- Behavioural: a Domain Event can be dragged to a new slot (others shift), dropped
  onto another to become concurrent, split back to its own slot, sent to
  start/end, and moved by arrow keys — all within its context; positions still
  computed, never hand-set; no empty columns left behind.
- A subagent verifies from the docs that every linked `us-00010` GWT has a passing
  test and no requirement is unfinished; a `docs/record/` acceptance checklist
  links the GWT ids (CLAUDE.md §7). Any gap blocks `resolved`.

**Verified 2026-07-21** — subagent verdict PASS, no gaps; acceptance evidence in
[record-00007-timeline-editing-acceptance](../record/record-00007-timeline-editing-acceptance.md).
