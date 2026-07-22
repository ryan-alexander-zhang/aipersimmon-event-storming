---
id: record-00008-model-health-acceptance
type: record
role: main
status: active
parent: plan-00008-model-health-analysis
---

# Acceptance record: model-health analysis

Acceptance evidence for [plan-00008](../plan/plan-00008-model-health-analysis.md),
implementing [us-00011](../us/us-00011-model-health-findings.md) per
[spec-00007](../spec/spec-00007-model-health-analysis.md). Verified 2026-07-21.
An independent subagent cross-checked every us-00011 GWT and every spec-00007 XAC
against the tests. First pass flagged two gaps (spec-00007-XAC-2.1 had no
automated test; us-00011-AC-4.1's healthy empty-state UI was unasserted); both
were closed with new tests and a re-verification returned **PASS**, no residual
coverage gaps.

## Gate results

- Unit: **158 passed** (`bun run test`); `lib/**` coverage **97.84% stmts /
  88.79% branch / 98.47% funcs / 99.55% lines** (≥90% lines/funcs bar met);
  `analysis/health.ts` 100% lines / 100% funcs / 93.22% branch; `store.ts`
  100% lines (the added `toggleHealth` covered by unit test).
- E2E: **28 passed** (`bun run test:e2e`, Playwright/chromium).
- `bunx tsc --noEmit`, `bun run lint`, `bun run build` all clean.

## GWT / XAC coverage

| Id | Test(s) | Result |
| --- | --- | --- |
| us-00011-AC-1.1 (orphan-event names event) | unit health.test.ts `orphan-event … flags a Domain Event nothing produces or emits`; e2e `model health lists a smell…` | pass |
| us-00011-AC-1.2 (dangling-command names command) | unit health.test.ts `dangling-command …` (+ direct / multi-hop / loop cases) | pass |
| us-00011-AC-1.3 (overloaded-aggregate names aggregate) | unit health.test.ts `overloaded-aggregate …` (asserts `elementIds==["a"]` + label in message) | pass |
| us-00011-AC-1.4 (policy-cycle names cycle) | unit health.test.ts `policy-cycle … reaction cycle through a policy` (+ acyclic / no-policy negatives) | pass |
| us-00011-AC-2.1 (finding clears on recompute) | unit health.test.ts `reflects a model change: fixing an orphan clears its finding` | pass |
| us-00011-AC-3.1 (select finding → focus element) | e2e editor.spec.ts `model health lists a smell, focuses its element…` (Label field shows the event) | pass |
| us-00011-AC-4.1 (no smells → healthy empty state) | unit health.test.ts (empty + clean slice → `[]`); e2e `model health shows a healthy empty state …` (`health-empty` visible, 0 findings) | pass |
| us-00011-AC-5.1 (editing not blocked) | e2e `model health …` (edits label to "Order Confirmed" with panel open) | pass |
| spec-00007-XAC-1.1 (advisory, no block/modal) | e2e `model health …` (panel stays visible, edit succeeds) | pass |
| spec-00007-XAC-2.1 (recompute at few-hundred scale) | unit health.test.ts `scales to a few hundred elements …` (~599 nodes; correct findings; `<500ms` guard) | pass |

## FR realization

FR-1 → the five smell types, each unit-tested (`orphan-event`,
`dangling-command`, `overloaded-aggregate`, `policy-cycle`,
`unresolved-hotspots`). FR-2 → recompute, unit AC-2.1 + `useMemo(analyzeModel,
[nodes, edges])` in `health-panel.tsx`. FR-3 → select/focus via
`setSelected` + `fitView` (e2e). FR-4 → healthy empty state (unit + e2e). FR-5 →
non-blocking advisory panel (e2e). All realized.

## Deliverables

- `web/lib/analysis/health.ts` — pure `analyzeModel(nodes, edges): Finding[]`.
- `web/components/health-panel.tsx` — advisory panel; finding → `fitView` focus.
- `web/lib/store/store.ts` — `healthOpen` + `toggleHealth` (view-only, not persisted).
- Toolbar `Health` toggle; `editor.tsx` renders the panel.

## Residual note (non-blocking)

spec-00007-XAC-2.1's guard is a single absolute 500ms budget on a ~599-node
model, not a comparative two-size measurement. It catches gross blow-up and
serves as a regression guard; it does not by itself prove sub-quadratic scaling.
Adequate for this feature's acceptance.
