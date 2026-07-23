---
id: plan-00018-bounded-context-focus
type: plan
role: main
status: resolved
parent: spec-00010-bounded-context-focus
---

# Plan: bounded context focus + compact header

Implements [spec-00010](../spec/spec-00010-bounded-context-focus.md) /
[us-00024](../us/us-00024-focus-bounded-context.md). Aligns with
[decision-00005](../decision/decision-00005-global-timeline-bc-as-region.md) —
**no layout change, no new region/frame, no DSL change.** Adds transient
Bounded Context Focus view state + a compact header, **reusing the existing
focus/dim pipeline** (`computeFocus`/`FocusSet` → `NODE_DIM_OPACITY` +
edge `focusState`). Terms follow [CONTEXT.md](../../CONTEXT.md).

## Stage A — focus state + context focus set (own commit)

| # | Task | Verify |
|---|---|---|
| A1 | `lib/store/focus.ts` (beside `computeFocus`): pure `computeContextFocus(contextId, nodes, edges): FocusSet`. `nodeIds` = members (`data.context === contextId`) ∪ neighbours **not in a different context**; `edgeIds` = every edge incident to a member (so cross-context seams are `"on"`). | unit `focus.test.ts`: members only when no edges; members + connected Ungrouped command/actor included; a neighbour in *another* context is **excluded** from nodeIds but its seam edge **is** in edgeIds; unknown/empty id → inactive/empty |
| A2 | `store.ts`: add transient `focusedContext: string \| null` + `setFocusedContext(id \| null)` (single-select; passing the current id clears). Not serialized; cleared by `removeContext`/`setModel`/`clear`. | unit `store.test.ts`: set → get; set same id twice → null; `removeContext(focused)` → cleared; `setModel`/`clear` → null; serialize output has no focus field (XAC-1.1) |
| — | **Checkpoint + commit** state + focus set. | tsc/lint/unit green |

## Stage B — wire focus into the render pipeline (own commit)

| # | Task | Verify |
|---|---|---|
| B1 | `editor.tsx`: in the `focus` memo, when `focusedContext` is set use `computeContextFocus(...)` as the focus set (a hovered node still previews its own chain via `computeFocus`); otherwise unchanged. Clear `focusedContext` on `Escape` (when not mid-drag) and `onPaneClick`. Dimming/seam-highlight then falls out of the existing node/edge pipeline — **no change to `element-node.tsx` / `relation-edge.tsx`**. | e2e (B2) |
| B2 | e2e `bc-focus.spec.ts`: seed contexts A/B with events + a cross-context relation. Click A → assert an A member is full opacity and a B member is dimmed (assert computed opacity, per memory note — do **not** rely on RF drag). Click B → A dims, B vivid. Click A again + Esc + pane-click → all restored. Cross-context seam edge stays non-dimmed (AC-1.1/2.1/3.1/4.1). | `bun run test:e2e` green |
| — | **Checkpoint + commit** wire-in. | tsc/lint/build/e2e green |

## Stage C — compact header (own commit)

| # | Task | Verify |
|---|---|---|
| C1 | `board-chrome.tsx`: rebuild the context legend as a single horizontally-scrollable compact row. Chip = colour dot + name label + subdomain badge (always visible); chip body toggles focus (`setFocusedContext`). Move rename (double-click / menu), classification, delete behind hover/`⋯`. Keep "+ Event" as the per-context create entry. Add Esc + empty-canvas-click to clear focus. | e2e (C2) |
| C2 | e2e `bc-header.spec.ts`: render 12 contexts → assert header is one row and its bounding-box height equals the 1-context case (per memory: assert real `boundingBox().height`, not just count); "+ Event" from a chip creates an event in that context (AC-5.1/6.1); edit controls reachable via hover/menu. | `bun run test:e2e` green |
| — | **Checkpoint + commit** header. | tsc/lint/build/e2e green |

## Stage D — docs

| # | Task | Verify |
|---|---|---|
| D1 | `CONTEXT.md`: add **Bounded Context Focus** (transient view: click a context to keep its slice vivid and dim the rest; distinct from Filter=hide and Walkthrough=step). Confirm no drift with Timeline / Bounded Context / Version Compare. | glossary consistent |
| D2 | Promote spec-00010 / us-00024 / plan-00018 as reviewed (spec+us → active). Confirm no new decision needed (aligns with decision-00005; note in spec §1). | statuses + links correct |

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- All code stages done; `tsc`, `bun run lint`, `bun run build` clean; unit + e2e
  green; `lib/**` coverage DoD held.
- Behavioural: clicking a context dims the rest and keeps its slice + seams vivid;
  single-select; click-again/Esc/empty-click clears; header is one fixed-height
  row at 10+ contexts; "+ Event" still creates in-context; export carries no focus
  state.
- A subagent verifies from the docs that every us-00024 GWT (AC-1.1/2.1/3.1/4.1/
  5.1/6.1) and spec-00010-XAC-1.1 has a passing test; a `docs/record/` acceptance
  checklist links the ids. Any gap blocks `resolved`.

**Verified 2026-07-23** — independent subagent verdict **PASS** on all GWTs, no
gaps. Evidence in
[record-00018](../record/record-00018-bounded-context-focus-acceptance.md). 256
unit + 48 e2e green; tsc + lint + `bun run build` clean. All DoD gates met —
**resolved**.
