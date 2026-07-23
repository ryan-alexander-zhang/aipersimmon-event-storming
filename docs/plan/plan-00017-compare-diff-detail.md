---
id: plan-00017-compare-diff-detail
type: plan
role: main
status: resolved
parent: spec-00008-model-versioning-compare
---

# Plan: field-level change detail in the compare diff

Implements the us-00023 FR-8/FR-9 extension per
[design-00010](../design/design-00010-compare-diff-detail.md); scope fixed by
[decision-00010](../decision/decision-00010-diff-field-level-detail.md). Deepens the
unified diff (plan-00016) so a changed element shows *what* changed. **No
store/DSL/persistence change** — engine detail + rendering only. Terms follow
[CONTEXT.md](../../CONTEXT.md).

## Stage A — engine detail (own commit)

| # | Task | Verify |
|---|---|---|
| A1 | `lib/dsl/diff.ts`: add `FieldChange`, `ChangedNode`, and `changed: Map<id, {before, after, fields}>` to `ModelDiff`; populate `fields` from the differing subset of `label/order/context/pivotal/state/kind/priority/description`. | unit `diff.test.ts`: rename → fields=[label]; order move → [order] with before/after; context reassign → [context]; multi-field → all listed; unchanged → not in `changed` |
| — | **Checkpoint + commit** engine. | tsc/lint/tests green |

## Stage B — inline + hover detail (own commit)

| # | Task | Verify |
|---|---|---|
| B1 | `compare-diff-view.tsx`: build `Map<id, DiffChange>` (`renamedFrom`, `chips`, `detail`) from `diff.changed`, resolving context ids → names via base/target `contexts`; order → direction chip; pass to `SnapshotBoard`. | unit (pure helper if extracted) / e2e below |
| B2 | `snapshot-board.tsx`: accept `changes?: Map<id, DiffChange>`; attach `data.diffChange` per node. `snapshot-node.tsx`: render `renamedFrom` (struck old label), `chips` (tag row), and `detail` as the node `title`. | e2e: rename shows struck old label (AC-8.1); order move shows a later chip (AC-8.2); hover shows `context: old → new` in title (AC-9.1) |
| — | **Checkpoint + commit** detail UI. | tsc/lint/build/tests green |

## Stage C — docs

| # | Task | Verify |
|---|---|---|
| C1 | Promote decision-00010/design-00010/plan-00017 + us-00023 (FR-8/9) as reviewed. Update spec-00008 §6 (remove "field-by-field change detail" non-goal; link design-00010/plan-00017). | statuses + links correct |
| C2 | CONTEXT.md: no new term (Version Compare already covers it); confirm no drift. | glossary consistent |

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- Both code stages done; `tsc`, `bun run lint`, `bun run build` clean; unit + e2e
  green; `lib/**` coverage ≥90% (lines/funcs) held.
- Behavioural: a renamed element shows old (struck) → new; order move shows a
  direction chip; context/property changes show chips; hovering a changed element
  reveals full field-level before → after with resolved context names.
- A subagent verifies from the docs that every us-00023 FR-8/FR-9 GWT (AC-8.1/8.2/9.1)
  has a passing test; a `docs/record/` acceptance checklist links the ids. Any gap
  blocks `resolved`.

**Verified 2026-07-23** — subagent verdict PASS on AC-8.1/8.2/9.1, no gaps. Acceptance
evidence in
[record-00017-compare-diff-detail-acceptance](../record/record-00017-compare-diff-detail-acceptance.md).
245 unit + 45 e2e green; tsc/lint/build clean; `diff.ts` + `diff-display.ts` 100%
lines/funcs.
