---
id: plan-00019-structured-rule-expression
type: plan
role: main
status: open
parent: spec-00011-structured-rule-expression
---

# Plan: structured rule expression (Policy / Constraint)

Implements [us-00026](../us/us-00026-policy-rule-detail.md) and
[us-00027](../us/us-00027-constraint-rule.md) per
[spec-00011](../spec/spec-00011-structured-rule-expression.md). Additive and
backward compatible — DSL stays `4.0`. Two phases: the **model/DSL core**
(schema + serialize + store, unit-tested) lands first; the **UI** follows. No new
element, relation, or grammar change. Terms follow
[CONTEXT.md](../../CONTEXT.md).

## Design

New optional attributes on the shared `propertiesSchema`, mirrored on `ESNodeData`
and mapped both ways in `serialize.ts` (same `...(x !== undefined ? {x} : {})`
pattern already used for `state`/`kind`/`priority`):

| Attribute | Type | For | Absent = |
|---|---|---|---|
| `condition` | `string` | Policy | no guard |
| `execution` | `"automatic" \| "manual"` | Policy | unspecified |
| `parameters` | `Array<{ name: string; value: string }>` | Policy | no parameters |
| `rule` | `string` | Constraint | no rule |

All written through the existing `updateNodeData`; `parameters` is replaced as a
whole list on edit. The property panel gates each control by the selected node's
element type. `DSL_VERSION` stays `"4.0"`; `migrate.ts` is untouched.

## Phase 1 — model, DSL, store

| # | Task | Verify |
|---|---|---|
| P1.1 | `schema.ts` `propertiesSchema`: add optional `condition`, `execution` (enum), `parameters` (array of `{name,value}`), `rule`; mirror on `ESNodeData`. Keep `DSL_VERSION = "4.0"`. | unit schema.test.ts: parses with and without the fields; rejects a bad `execution` value and a `parameters` entry missing `name`/`value`; a pre-spec fixture still parses (spec-00011-XAC-1.1) |
| P1.2 | `serialize.ts`: map the four fields in both directions (data→properties export, properties→data import), following the existing optional-spread pattern. | unit serialize.test.ts: round-trips a Policy with condition/execution/parameters and a Constraint with rule; omits absent fields; round-trips a node with none (us-00026-AC-4.1, us-00027-AC-2.1) |
| P1.3 | `store.ts`: confirm the four fields are writable via existing `updateNodeData`, including replacing the whole `parameters` list; no new action. | unit store.test.ts: `updateNodeData` sets `condition`/`execution`; adds two parameters then removes one leaving the other (us-00026-AC-1.1/2.1/3.1, us-00027-AC-1.1) |
| P1.4 | `CONTEXT.md`: note the four attributes on the Policy and Constraint entries (glossary-only, one line each). | doc: terms present and consistent with spec-00011 §4 |

## Phase 2 — UI

| # | Task | Verify |
|---|---|---|
| P2.1 | `property-panel.tsx`: for a selected **Policy** render a `condition` text field, an `execution` automatic/manual control, and an add/remove list of `parameters` (name + value rows); for a selected **Constraint** render a `rule` field beside `description`. Gate each by element type (mirror the existing Hotspot controls). | run: set condition; toggle execution; add/remove a parameter; set a constraint rule (us-00026-AC-1.1/2.1/3.1, us-00027-AC-1.1) |
| P2.2 | `nodes/element-node.tsx`: minimal presence indicator on a Policy (e.g. a manual-execution marker), mirroring how Hotspot kind/priority surface. Keep it small. | run: a `manual` Policy reads distinct from an `automatic`/unset one |
| P2.3 | `e2e/editor.spec.ts`: set a Policy's condition + execution + a parameter and a Constraint's rule; export → import preserves them; a pre-spec `4.0` fixture imports unchanged. | `bun run test:e2e` green (us-00026-AC-4.1, us-00027-AC-2.1, spec-00011-XAC-1.1) |

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- Phase 1 + Phase 2 tasks done; `tsc`, `bun run lint`, `bun run build` clean;
  unit + e2e green; `lib/**` coverage ≥90% (lines/funcs).
- Behavioural: a Policy can carry a condition, an automatic/manual execution mode,
  and named parameters; a Constraint can carry its invariant rule distinct from
  its description; all four are optional and a model with none set behaves and
  exports exactly as before; old `4.0` files still import unchanged.
- A subagent verifies from the docs that every linked `us-00026`/`us-00027` GWT
  and the `spec-00011-XAC` scenario have a passing test and no requirement is
  unfinished; a `docs/record/` acceptance checklist links the GWT/XAC ids
  (CLAUDE.md §7). Any gap blocks `resolved`.
