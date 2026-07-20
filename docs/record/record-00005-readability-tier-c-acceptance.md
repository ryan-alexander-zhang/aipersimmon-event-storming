---
id: record-00005-readability-tier-c-acceptance
type: record
role: main
status: active
parent: plan-00005-readability-tier-c-isolate-semantic-zoom
---

# Acceptance record: Tier C isolate + semantic zoom (plan-00005)

Acceptance evidence for [plan-00005-readability-tier-c-isolate-semantic-zoom](../plan/plan-00005-readability-tier-c-isolate-semantic-zoom.md),
implementing neighborhood isolation and semantic zoom from
[design-00003](../design/design-00003-board-readability-at-scale.md) §3 Tier C.
Verified 2026-07-20. View-only; acceptance is behavioural + quality gates.

## Gate results

- Unit: **98 passed** (`bun run test`). Coverage on `lib/**`: **91.52% branch /
  99.26% line** (≥90% bar met).
- E2E: **19 passed** (Playwright/chromium against the dev server).
- `tsc --noEmit`, `bun run lint`, `bun run build` clean.

## Task coverage

| Task | Delivered | Evidence |
| --- | --- | --- |
| TC1 neighbourhood helper | yes | `lib/store/focus.ts` `computeNeighborhood` (directional N-hop BFS, induced edges); `focus.test.ts` (down/up/both, depth, induced, lone) |
| TC2 isolate view state | yes | `lib/store/store.ts` `isolate {active,direction,depth}` + setters, reset on clear/setModel; `store.test.ts` |
| TC3 editor isolate filter | yes | `components/editor.tsx` restricts `visibleNodes` to the neighbourhood, gates dimming off in isolate, `fitView` on isolate change |
| TC4 isolate controls | yes | `components/property-panel.tsx` Isolate toggle + direction (up/both/down) + depth stepper |
| TC5 semantic-zoom filter | yes | `lib/eventstorming/levels.ts` `typesForZoom(zoom, level)` bounded by Level; `levels.test.ts` (full/mid/backbone, bounded) |
| TC6 editor semantic zoom | yes | `editor.tsx` `useStore` zoom → `typesForZoom`, composed with Level + isolate; `minZoom={0.2}` gives zoom-out range |
| TC7 verify + acceptance | yes | full unit/E2E green; visual check on the ride-hailing model |

## Success criteria

- **Isolate** (E2E `isolate keeps only the selected node's neighbourhood`):
  selecting a Domain Event with isolate on and `Downstream` shows only its
  downstream chain; `Upstream` shows only the producers; toggling off restores
  the full board. Visually confirmed on the ride-hailing model (Trip Ended,
  Upstream, depth 3 → Driver→End Trip→Trip Completion→Trip Ended only).
- **Semantic zoom** (E2E `semantic zoom drops detail when zoomed out` + unit):
  at a small board's fit zoom the full Level detail shows; zooming out past the
  threshold drops detail types (aggregates) while the Domain Event backbone
  stays; the visible set never exceeds the current Level.
- Model unchanged: isolate/zoom state is render-only; export/import round-trip
  and autosave E2E pass.

### Notes

1. React Flow's default `minZoom` is 0.5, which is above the semantic-zoom
   thresholds; set `minZoom={0.2}` so users can zoom out far enough for
   semantic zoom to engage (also useful for overviewing large boards).
2. Dimming (Tier A) is suppressed while isolating — the neighbourhood is already
   the only thing shown, so remaining nodes stay full opacity.

### Deferred (noted in plan-00005)

Collapse-a-BC/slice-into-a-card (C2 "collapse" half) and back-edge reduction /
band reorder (C3) are not part of this increment.

## Verdict

**ACCEPTED** — isolation and semantic zoom shipped, all quality gates green,
Tier A/B behaviour preserved, no DSL leakage. plan-00005 → `resolved`.
