---
id: record-00009-hotspot-workflow-opportunity-acceptance
type: record
role: main
status: active
parent: plan-00009-hotspot-workflow-opportunity
---

# Acceptance record: hotspot workflow + opportunity

Acceptance evidence for [plan-00009](../plan/plan-00009-hotspot-workflow-opportunity.md),
implementing [us-00012](../us/us-00012-hotspot-workflow.md) and
[us-00013](../us/us-00013-opportunity-element.md) per
[spec-00003](../spec/spec-00003-hotspot-workflow-opportunity.md). Verified 2026-07-22.
An independent subagent cross-checked every us-00012 / us-00013 GWT and the
spec-00003 XAC against the tests. First pass flagged three gaps (us-00012-AC-1.1
reopen clause, us-00012-AC-2.1 "shown", us-00013-AC-2.1 opportunity edit); all
were closed with added e2e assertions and a re-verification returned **PASS**.

## Gate results

- Unit: **164 passed** (`bun run test`); `lib/**` coverage **97.86% stmts /
  89.23% branch / 98.49% funcs / 99.55% lines** (≥90% lines/funcs bar met). All
  changed lib files at 100% lines: `elements.ts`, `relations.ts`, `levels.ts`,
  `schema.ts`, `serialize.ts`, `store.ts`, `health.ts`.
- E2E: **30 passed** (`bun run test:e2e`, Playwright/chromium).
- `bunx tsc --noEmit`, `bun run lint`, `bun run build` all clean.

## GWT / XAC coverage

| Id | Test(s) | Result |
| --- | --- | --- |
| us-00012-AC-1.1 (resolve stores + muted + reopen un-mutes) | e2e "hotspot workflow…" (check → `data-resolved="true"`; uncheck → attribute cleared); serialize round-trip stores `state` | pass |
| us-00012-AC-2.1 (kind + priority stored and shown) | e2e "hotspot workflow…" (set Kind/Priority via panel → node shows "question"/"high"); serialize round-trip | pass |
| us-00012-AC-3.1 (resolve one of two → count drops) | unit health.test.ts "counts only open hotspots…"; e2e (finding disappears) | pass |
| us-00012-AC-4.1 (absent state counted as open) | unit health.test.ts + serialize XAC test | pass |
| us-00013-AC-1.1 (opportunity node + highlights edge) | unit store.test.ts "attaches an opportunity via a highlights edge"; relations.test.ts; e2e | pass |
| us-00013-AC-2.1 (edit opportunity text) | e2e "opportunity…" (`Text` → "bundle upsell" shown on node) | pass |
| us-00013-AC-3.1 (own colour/band, distinct, every level) | unit levels.test.ts "shows Opportunity at every level"; e2e (`rgb(0,200,83)`, visible at Big Picture) | pass |
| us-00013-AC-4.1 (invalid connection rejected) | unit relations.test.ts "only allows the valid pairs (exhaustive matrix)" | pass |
| spec-00003-XAC-1.1 (old v2.0 file imports, hotspots open) | unit serialize.test.ts "imports a pre-spec v2.0 file…" | pass |

## FR realization

us-00012: FR-1 (state + muted render), FR-2 (kind/priority + badges), FR-3
(`health.ts` counts `state !== "resolved"`), FR-4 (absent = open). us-00013: FR-1
(`store.addOpportunity` → `highlights`), FR-2 (`updateNodeData`), FR-3
(`elements.ts` `#00C853` + `opportunity` band; `levels.ts` all three levels;
`board-chrome.tsx` rail), FR-4 (`isValidConnection` gate). All realized.

## Deliverables

- Model/grammar: `opportunity` element + band; `highlights` relation; optional
  `state`/`kind`/`priority` on `propertiesSchema` + `ESNodeData` + `serialize.ts`
  (DSL stays `2.0`, additive/backward compatible); `store.addOpportunity`.
- Analysis: `unresolved-hotspots` narrowed to open (closes the spec-00007 forward
  dependency).
- UI: `element-node.tsx` (opportunity icon/colour, resolved muting, kind/priority
  badges), `property-panel.tsx` (hotspot state/kind/priority controls, +Opportunity
  slice/palette), `edge-style.ts`, `board-chrome.tsx`.
- CONTEXT.md: Opportunity element, `highlights` relation, Hotspot state/kind/priority.

## Deferred (recorded, not built)

Dot-voting (a collaboration feature → #2) and one-click "promote a Hotspot to a
`docs/decision`" were scoped out of v1 (spec-00003 §1). Not gaps — deliberate.
