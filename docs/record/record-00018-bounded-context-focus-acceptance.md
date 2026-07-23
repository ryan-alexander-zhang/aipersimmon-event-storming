---
id: record-00018-bounded-context-focus-acceptance
type: record
role: main
status: active
parent: plan-00018-bounded-context-focus
---

# Acceptance record: bounded context focus + compact header

Acceptance evidence for [plan-00018](../plan/plan-00018-bounded-context-focus.md),
implementing [spec-00010](../spec/spec-00010-bounded-context-focus.md) /
[us-00024](../us/us-00024-focus-bounded-context.md). Aligns with
[decision-00005](../decision/decision-00005-global-timeline-bc-as-region.md) — no
layout change, no new region/frame, no DSL change. Reuses the existing focus/dim
pipeline (`computeFocus`/`FocusSet` → `NODE_DIM_OPACITY` + edge `focusState`).
Verified 2026-07-23. An independent subagent cross-checked every GWT; verdict
**PASS**, no gaps.

## Gate results

- Unit: **256 passed** (`bun run test`).
- E2E: **48 passed** (`bunx playwright test`, chromium).
- `bunx tsc --noEmit` clean; `bun run lint` clean; `bun run build` clean.

## GWT coverage

| Id | Test(s) | Result |
| --- | --- | --- |
| us-00024-AC-1.1 (focus → slice vivid, others dim) | e2e `editor.spec.ts` "focuses a context…" (alpha opacity 1, bravo 0.15) | pass (e2e) |
| us-00024-AC-2.1 (single-select swaps) | e2e same test (focus swap); unit `store.test.ts` "focuses a context and toggles it off" | pass (e2e + unit) |
| us-00024-AC-3.1 (re-click OR Esc → restored) | e2e same test (toggle + Esc restore); unit `store.test.ts` (toggle / null / reset) | pass (e2e + unit) |
| us-00024-AC-4.1 (cross-context seam stays visible) | unit `focus.test.ts` "keeps a cross-context seam edge on…" (seam in `edgeIds`, other node excluded from `nodeIds`) | pass (unit) |
| us-00024-AC-5.1 (10+ contexts → one fixed-height row) | e2e "context header stays one fixed-height row…" (boundingBox height 1 vs 12 contexts) | pass (e2e) |
| us-00024-AC-6.1 (+Event from header creates in-context event) | e2e "adds a Domain Event into its band via a context header" (`editor.spec.ts:37`) + "adds events across two contexts" (per-chip Add Event); focus test proves membership | pass (e2e) |
| spec-00010-XAC-1.1 (focus never in exported DSL) | unit `store.test.ts` "focus is view-only — never written to the exported DSL" | pass (unit) |

Notes (subagent): AC-4.1 is proven at the unit layer (the pure `computeContextFocus`),
not via a seam-edge e2e; AC-6.1 is proven by the header-create e2e plus the focus
test's membership dependency. Combined coverage is genuine. The new e2e was folded
into `editor.spec.ts` (single-file convention) rather than the separate
`bc-focus`/`bc-header` files named in the plan — no functional impact.

## Defect found & fixed during acceptance

The `⋯` context menu did not open in the real browser: the header strip uses
`overflow-x-auto`, and CSS coerces `overflow-y` from `visible` to `auto` on that
element, so the `absolute`-positioned dropdown (below the row) was clipped by the
strip's vertical overflow. The e2e had masked it — Playwright's `.click()`
auto-scrolls a clipped element into view before clicking. Fix: the menu (and its
click-away layer) now render via `createPortal` to `document.body` with `fixed`
positioning anchored to the trigger's rect, escaping the scroll container. The
classify e2e now asserts `toBeInViewport()` on the open menu, which fails under the
old clipped rendering and passes with the portal. This was in-flight, uncommitted
feature code (never shipped), so it was fixed within plan-00018 rather than tracked
as a separate `docs/issue`.

## Deliverables

- **Focus set**: `lib/store/focus.ts` — pure `computeContextFocus(contextId, nodes,
  edges): FocusSet` (members ∪ non-foreign-context neighbours; every member-incident
  edge, so cross-context seams stay highlighted).
- **State**: `lib/store/store.ts` — transient `focusedContext` + `setFocusedContext`
  (single-select / toggle); cleared by `removeContext`/`setModel`/`clear`; not
  serialized.
- **Wire-in**: `components/editor.tsx` — context focus feeds the existing `focus`
  memo (hover still previews a node's chain); Esc + empty-canvas click clear focus.
  No change to `element-node.tsx` / `relation-edge.tsx`.
- **Header**: `components/board-chrome.tsx` — one compact, horizontally-scrollable
  row; chip = colour + name + always-visible subdomain badge, chip body toggles
  focus; `+` (Add Event) stays one-click; rename / classify / delete behind the
  `⋯` menu.
- **Glossary**: `CONTEXT.md` — new term **Bounded Context Focus** (dims, never
  hides; distinct from a filter and the Walkthrough).
