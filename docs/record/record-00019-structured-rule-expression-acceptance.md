---
id: record-00019-structured-rule-expression-acceptance
type: record
role: main
status: active
parent: plan-00019-structured-rule-expression
---

# Acceptance record: structured rule expression (Policy / Constraint)

Acceptance evidence for [plan-00019](../plan/plan-00019-structured-rule-expression.md),
implementing [us-00026](../us/us-00026-policy-rule-detail.md) and
[us-00027](../us/us-00027-constraint-rule.md) per
[spec-00011](../spec/spec-00011-structured-rule-expression.md). Verified 2026-07-24.
An independent subagent cross-checked every us-00026 / us-00027 GWT and the
spec-00011 XAC against the tests, judging assertion-by-assertion (not by id
mention); it returned **PASS** on the first pass with no gaps.

## Gate results

- Unit: **267 passed** (`bun run test`, Vitest). Changed `lib/**` files:
  `serialize.ts` **100% lines / 98.07% branch / 100% funcs**; `dsl/` aggregate
  **100% lines / 90.07% branch / 100% funcs**; `store/types.ts` is type-only
  (no runtime). ≥90% lines/branch/funcs bar met for the changed code.
- E2E: **53 passed** (`bun run test:e2e`, Playwright/chromium).
- `tsc --noEmit`, `bun run lint`, `bun run build` all clean.

## GWT / XAC coverage

| Id | Test(s) | Result |
| --- | --- | --- |
| us-00026-AC-1.1 (set Policy condition → stored + shown) | unit store.test.ts "writes a Policy's condition and execution…"; e2e "policy and constraint…" (fills Condition → export asserts `policy.properties.condition`; survives re-import) | pass |
| us-00026-AC-2.1 (execution manual → stored + shown; automatic replaces) | unit store.test.ts (manual asserted, then automatic replaces); e2e (select "manual" → node `toContainText("manual")`) | pass |
| us-00026-AC-3.1 (add retry+radius → both; remove retry → only radius) | unit store.test.ts "replaces a Policy's parameter list on edit" (length 2 → `toEqual([{radius,2km}])`) | pass |
| us-00026-AC-4.1 (Policy with none set → export/reimport unchanged) | unit serialize.test.ts "omits absent rule fields on export" + round-trip; e2e re-import round-trip | pass |
| us-00027-AC-1.1 (set Constraint rule → stored, distinct from description) | unit store.test.ts "writes a Constraint's rule…" (description + rule both present); e2e (separate gated Description/Rule controls → export asserts both) | pass |
| us-00027-AC-2.1 (Constraint with no rule → export/reimport unchanged) | unit serialize.test.ts (4.0 constraint with empty properties → `rule` undefined) + round-trip | pass |
| spec-00011-XAC-1.1 (pre-spec 4.0 file imports; renders as before) | unit serialize.test.ts "imports a pre-spec v4.0 file without the rule fields unchanged" (`result.ok`, all rule fields undefined) | pass |

Supporting negative tests (spec-00011 §5 error handling): schema.test.ts rejects
`execution:"eventual"` and a `parameters` entry missing `value`, and accepts a
valid Policy + Constraint.

## FR realization

- us-00026: FR-1 (condition), FR-2 (execution automatic/manual), FR-3
  (parameters add/edit/remove), FR-4 (all optional; none set = unchanged).
- us-00027: FR-1 (rule distinct from description), FR-2 (optional).
- spec-00011: XFR-1 (DSL stays `4.0`; new fields optional additive; pre-spec
  files import unchanged).

Every FR maps to a passing AC test.

## Deliverables

- Model/DSL: optional `condition` / `execution` / `parameters` (Policy) and
  `rule` (Constraint) on `propertiesSchema` (`schema.ts`) + `ESNodeData`
  (`store/types.ts`); mapped both ways in `serialize.ts`. DSL stays `4.0`,
  `migrate.ts` untouched. Written via existing `updateNodeData` (no new action).
- UI: `property-panel.tsx` (Policy condition/execution/parameters controls,
  Constraint rule field, each gated by element type); `element-node.tsx`
  (Policy execution badge).
- CONTEXT.md: the four attributes noted on the Policy and Constraint entries.

## Out of scope (recorded, not built)

Per spec-00011 §6: a GWT rule editor (idea-00002 option C), a Process/Saga
element (option D), rule evaluation, and model-health findings over the new
attributes. Not gaps — deliberately deferred.
