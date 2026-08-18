---
id: spec-00011-structured-rule-expression
type: spec
role: main
status: active
parent: idea-00002-structured-rule-expression
---

# Spec: structured rule expression (Policy / Constraint)

> The shippable capability: the two rule-bearing elements gain optional
> structured attributes beyond free-text `description` — a **Policy** carries a
> `condition` (guard), an `execution` mode (automatic/manual) and named
> `parameters`; a **Constraint** carries the invariant `rule` itself. Delivers
> [idea-00002](../idea/idea-00002-structured-rule-expression.md) (option B only).

## 1. Context

Canonical terms from [CONTEXT.md](../../CONTEXT.md): **Policy** and
**Constraint** (unchanged meanings). This spec adds four Policy/Constraint
**attributes** — `condition`, `execution`, `parameters`, `rule` — which will be
noted on the Policy and Constraint entries in CONTEXT.md when the feature is
built. Inputs: idea-00002;
[analysis-00002](../analysis/analysis-00002-complex-business-analysis-gaps.md) §3
(the Policy-expression gap it left open).

Scope decided (single-user, no backend, option B only): add **optional**
attributes, edited in the property panel, persisted as additive DSL fields.
No new element, no new relation, no grammar change, no rule evaluation.

US35 adds a fifth optional attribute, `alternativeSet`, under the same terms: an attribute
on the two element types that represent something happening — Domain Event and Command — no
new element and no new relation (decision-00013). It replaced US34's `Policy.dispatch`.

**Deferred (recorded here, not built)**: a full Given-When-Then rule editor
(idea-00002 option C); a **Process/Saga** element for multi-step orchestration
(option D); model-health findings over the new fields (e.g. a manual Policy with
no deciding Actor, or `parameters` without a `condition`) — a natural follow-up,
but out of this spec, except the two US35 needs for its own ambiguity (us-00035-FR-6/7: a
single moment with undeclared alternatives, and a set with one member).

## 2. User Stories

| Story | Doc | Status | Summary |
| --- | --- | --- | --- |
| US26 | [us-00026-policy-rule-detail](../us/us-00026-policy-rule-detail.md) | active | Policy carries condition / execution (auto·manual) / named parameters |
| US27 | [us-00027-constraint-rule](../us/us-00027-constraint-rule.md) | active | Constraint carries its invariant rule, distinct from description |
| US34 | [us-00034-policy-branch-dispatch](../us/us-00034-policy-branch-dispatch.md) | archived | superseded by US35: `Policy.dispatch`, removed |
| US35 | [us-00035-alternative-sets](../us/us-00035-alternative-sets.md) | resolved | Domain Events / Commands that happen instead of each other, as a named `alternativeSet` |

## 3. Cross-cutting requirements

- **spec-00011-XFR-1** (Ubiquitous) The system shall keep DSL `4.0` backward
  compatible: the new attributes are optional additive fields, so an existing
  `4.0` file without them shall import unchanged, with no rule attributes present
  and unchanged rendering.

### Acceptance (XAC)

- **spec-00011-XAC-1.1** (spec-00011-XFR-1)
  Given a `4.0` export produced before this spec (no condition/execution/
  parameters/rule on any node)
  When the Modeler imports it
  Then it loads without error
  And every Policy and Constraint renders exactly as before

## 4. Technical Design (inline — extract to `design/` if reused)

Terms per CONTEXT.md. Additive and backward compatible — **DSL stays `4.0`** (new
fields optional), so `migrate.ts` is untouched. No change to `elements.ts`,
`relations.ts`, or `levels.ts` — no new type, relation, or level behaviour.

**Node attributes** (`schema.ts` `propertiesSchema`, mirrored on `ESNodeData` and
mapped in `serialize.ts`), all optional:
- `condition`: `string` — a Policy's guard, the "if" between its trigger and its
  invoked command (semantically for Policy).
- `execution`: `"automatic" | "manual"` — whether a Policy reacts automatically or
  needs a human decision (semantically for Policy; absent = unspecified).
- `parameters`: `Array<{ name: string; value: string }>` — a Policy's named
  thresholds/parameters (e.g. `retry=3`, `radius=2km`); absent or empty = none.
- `rule`: `string` — a Constraint's invariant/assertion itself, distinct from the
  prose `description` (semantically for Constraint).

These follow the Hotspot `state/kind/priority` precedent (spec-00003): shared
`propertiesSchema`, optional, defaulting to absent. `parameters` is the one
non-scalar addition; it stays a flat list of name/value string pairs (no nested
objects, no typing of values) to keep it lightweight.

**Store** (`store.ts`): all four are written through the existing `updateNodeData`
(as Hotspot attributes are); `parameters` is replaced as a whole list on edit. No
new store action.

**UI** (property panel): for a selected **Policy**, show a `condition` text field,
an `execution` automatic/manual control, and an add/remove list of `parameters`
(name + value rows); for a selected **Constraint**, show a `rule` field alongside
the existing `description`. The node itself may surface a small presence
indicator (e.g. a manual-execution marker), mirroring how Hotspot kind/priority
are shown — kept minimal.

## 5. Error handling

- Import of a pre-spec `4.0` file → new fields absent → no rule attributes, no
  behaviour change (XAC-1.1).
- `execution` outside `automatic`/`manual`, or a `parameters` entry missing
  `name`/`value` → rejected by `propertiesSchema` on import (`safeParse`), like
  any other invalid property.
- A non-Policy node with a stray `condition`/`execution`/`parameters`, or a
  non-Constraint with a stray `rule` → schema-valid (shared properties) but not
  shown in the panel; the property panel gates each control by element type.

## 6. Out of scope

- GWT rule editor (idea-00002 option C).
- Process/Saga element (idea-00002 option D).
- Rule evaluation / a rule engine.
- Model-health findings over the new attributes.

## Links

- Idea: idea-00002-structured-rule-expression · Analysis: analysis-00002 §3
- Plan: plan-00019-structured-rule-expression (resolved) · Record:
  record-00019-structured-rule-expression-acceptance
