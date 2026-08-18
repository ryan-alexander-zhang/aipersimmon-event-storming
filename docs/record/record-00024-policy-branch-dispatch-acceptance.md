---
id: record-00024-policy-branch-dispatch-acceptance
type: record
role: main
status: active
parent: us-00034-policy-branch-dispatch
---

> **The mechanism recorded here was replaced the next day** by
> [us-00035](../us/us-00035-alternative-sets.md) /
> [decision-00013](../decision/decision-00013-alternative-sets-recover-the-fork-the-layout-removed.md):
> `Policy.dispatch` was removed in favour of a named alternative set over the outcomes,
> because a Domain Event's fork often has no element to carry a marker. This record stands
> as evidence of what shipped and passed at the time.

# Acceptance record: a Policy says whether its Commands are alternatives

Acceptance evidence for [us-00034](../us/us-00034-policy-branch-dispatch.md) under
[spec-00011](../spec/spec-00011-structured-rule-expression.md), designed by
[decision-00012](../decision/decision-00012-branching-as-policy-dispatch-not-edge-guards.md).
Verified 2026-08-18.

No `docs/plan` doc: one optional attribute across schema / serialize / panel / sticky /
health plus the skill's copy — localized, so DEVELOPMENT.md's inline-reasoning path
applies. Coverage was cross-checked assertion-by-assertion in-session rather than by an
independent subagent (CLAUDE.md §7), because this session was instructed not to spawn
agents. Read the mapping below as self-reported.

## Gate results

- Unit: **348 passed** (`bun run test`). New: 1 in `serialize.test.ts`, 3 in
  `health.test.ts`; each was red before the implementation.
- E2E: **93 passed, 1 failed** (`bunx playwright test`). The failure is the pre-existing
  `[issue-00028]` wheel-zoom budget (asserts < 3 ms, ~7 ms on this machine), confirmed
  pre-existing on a clean tree in issue-00036 and unrelated to this work.
- `tsc --noEmit` and lint clean.
- No DSL bump and no migration: `dispatch` is an optional additive property on the same
  footing as `condition` / `execution` / `parameters`, and absent means `parallel`.

## GWT coverage

| Id | Test(s) | Result |
| --- | --- | --- |
| AC-1.1 (set dispatch to exclusive → stored, and the Policy shows alternatives) | e2e "a Policy marks its two Commands as alternatives, and health asks when it does not": `Dispatch` → `exclusive`, then the sticky contains "one of"; unit serialize.test "round-trips a Policy's dispatch" for the stored value | pass |
| AC-1.2 (back to parallel → the marker goes) | e2e same test's tail: after selecting `parallel` the sticky no longer contains "one of" | pass |
| AC-2.1 (no dispatch → renders as before, nothing claims alternatives) | e2e same test, before anything is set: the sticky does not contain "one of"; unit serialize.test "omits absent rule fields on export" asserts `dispatch` is never written out | pass |
| AC-3.1 (dispatch + condition + parameters survive export/import) | unit serialize.test "round-trips a Policy's dispatch", export asserts `properties.dispatch === "exclusive"` | pass |
| AC-3.2 (a pre-story Policy imports clean) | unit serialize.test "imports a pre-spec v4.0 file without the rule fields unchanged", extended with `dispatch` undefined | pass |
| AC-4.1 (two invoked Commands and no dispatch is reported; declared is not) | unit health.test "reports a Policy invoking two Commands with no dispatch" and "says nothing once the Policy declares its dispatch, either way"; e2e asserts the finding appears, then disappears after declaring | pass |
| AC-4.2 (one invoked Command is never reported) | unit health.test "leaves a Policy invoking one Command alone — one command cannot be ambiguous" | pass |
| FR-5 (nothing evaluates the condition or chooses) | no test: a scope statement, and there is no code that reads `dispatch` other than the sticky chip and the health finding | n/a |

## Notes

- **The sticky marks only `exclusive`.** An unmarked Policy already means "all of them",
  so rendering `PARALLEL` would be noise; explicit `parallel` therefore looks the same as
  absent on the board, and only differs in that health stops asking. Deliberate.
- **Sticky height checked against issue-00036.** A Policy carrying both chips
  (`AUTOMATIC` `ONE OF`) measures 71.1px in flow space against the 96px stacking pitch,
  and the two chips stay on one row.
- **The authoring skill was updated in the same change**, so it cannot reject what the
  editor now accepts (the issue-00037 failure mode): `dispatch` in `validate.py`'s
  `PROPS` + `ENUMS`, a warning mirroring `undeclared-branch`, the property table and
  Policy guidance in `reference/dsl.md`, and the branch question plus a gate item in
  `reference/process.md`. Verified on a hand-built branching model: warns with no
  `dispatch`, silent with `exclusive`, and errors on `dispatch: "either"`.
- **`grammar.json` unaffected.** It carries the grammar (elements, levels, relations,
  context relations, DSL version), not the per-type property table; `PROPS` / `ENUMS`
  remain an unguarded mirror of `propertiesSchema` — the same drift class as
  issue-00037, recorded here rather than fixed.
- **Not built, per us-00034 *Out of scope*:** `dispatch` on `emits` / `produces` (a
  success event vs a failure event are alternatives too, and equal `order` still conflates
  concurrent with exclusive), CML's third operator `inclusive`, and any guard text on
  edges — rejected outright by decision-00012.
