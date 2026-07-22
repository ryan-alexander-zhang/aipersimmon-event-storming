---
id: plan-00009-hotspot-workflow-opportunity
type: plan
role: main
status: resolved
parent: spec-00003-hotspot-workflow-opportunity
---

# Plan: hotspot workflow + opportunity

Implements [us-00012](../us/us-00012-hotspot-workflow.md) and
[us-00013](../us/us-00013-opportunity-element.md) per
[spec-00003](../spec/spec-00003-hotspot-workflow-opportunity.md). Additive and
backward compatible — DSL stays `2.0`. Two phases: the **model/grammar core**
(pure + store, unit-tested) lands first; the **UI** follows. Terms follow
[CONTEXT.md](../../CONTEXT.md).

## Phase 1 — model, grammar, DSL, health

| # | Task | Verify |
|---|---|---|
| P1.1 | `elements.ts`: add `opportunity` type + colour; add `opportunity` band to `BAND_ORDER` / `ELEMENT_BAND`. | unit: type present; `bandIndex("opportunity")` valid |
| P1.2 | `relations.ts`: add `highlights` (opportunity → all elements) to `RELATION_TYPES` + `CONNECTION_RULES`. | unit relations.test.ts: `resolveRelation("opportunity", x)` = `highlights`; invalid stays null (us-00013-AC-1.1/4.1) |
| P1.3 | `schema.ts` `propertiesSchema`: optional `state`/`kind`/`priority`; mirror on `ESNodeData`; map in `serialize.ts`. Keep `DSL_VERSION = "2.0"`. | unit schema/serialize tests: round-trips with and without the fields; old fixture still parses (spec-00003-XAC-1.1) |
| P1.4 | `levels.ts`: add `opportunity` to all three `LEVEL_TYPES`. | unit levels.test.ts: `isVisibleAt(level, "opportunity")` true for every level (us-00013-AC-3.1) |
| P1.5 | `store.ts`: `addOpportunity(targetId, text)` mirroring `addHotspot`. | unit store.test.ts: creates opportunity node + `highlights` edge (us-00013-AC-1.1) |
| P1.6 | `health.ts`: `unresolved-hotspots` counts `state !== "resolved"`. | unit health.test.ts: resolved excluded, unset counted (us-00012-AC-3.1/4.1) |

## Phase 2 — UI

| # | Task | Verify |
|---|---|---|
| P2.1 | `element-node.tsx`: Opportunity icon (Lightbulb) + colour; render resolved Hotspots muted; show kind/priority on a Hotspot. | run: opportunity distinct; resolved hotspot muted (us-00012-AC-1.1, us-00013-AC-3.1) |
| P2.2 | `property-panel.tsx`: state/kind/priority controls for a selected Hotspot; `+ Opportunity` in the palette and in element slice actions. | run: set state/kind/priority; add an opportunity (us-00012-AC-1.1/2.1, us-00013-AC-1.1/2.1) |
| P2.3 | `edge-style.ts`: style for `highlights`. | run: highlights edge styled distinctly |
| P2.4 | `e2e/editor.spec.ts`: resolve a hotspot → health count drops + muted; add an opportunity → node + edge; distinct at Big Picture. | `bun run test:e2e` green |

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- Phase 1 + Phase 2 tasks done; `tsc`, `bun run lint`, `bun run build` clean;
  unit + e2e green; `lib/**` coverage ≥90% (lines/funcs).
- Behavioural: a Hotspot can be resolved/reopened (resolved muted), classified,
  and prioritised; model-health counts only open ones; an Opportunity can be
  attached to any element, edited, and reads as visually distinct at every level;
  old v2.0 files still import.
- A subagent verifies from the docs that every linked `us-00012`/`us-00013` GWT
  and the `spec-00003-XAC` scenario have a passing test and no requirement is
  unfinished; a `docs/record/` acceptance checklist links the GWT/XAC ids
  (CLAUDE.md §7). Any gap blocks `resolved`.

**Verified 2026-07-22** — subagent verdict PASS (three first-pass gaps closed
with added e2e, then re-verified); acceptance evidence in
[record-00009-hotspot-workflow-opportunity-acceptance](../record/record-00009-hotspot-workflow-opportunity-acceptance.md).
