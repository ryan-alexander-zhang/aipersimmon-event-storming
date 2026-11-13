---
id: decision-00019-rejected-synonyms-derived-integration-per-context-level
type: decision
role: main
status: active
parent: decision-00018-heuristics-decide-events-contexts-and-aggregates
---

# Rejected synonyms, derived integration style, and a level per context

## Context

A downstream repository is retiring its own domain model (persimmon DSL 4.2, a
`DOMAIN.yaml` and two skills) and moving entirely to `skills/event-storming`.
That makes this DSL its only source for:

- the domain model;
- the Context Map;
- the Ubiquitous Language;
- the event model.

Its existing model converts to 5.1 with no validator error. Comparing the two
systems still found four places where the old one says something 5.1 cannot, or
says it more weakly. Each is decided here on first principles, not on the cost
of changing it.

1. **Rejected synonyms.** A term in the old model lists the words it does *not*
   go by.
2. **Integration style.** Each relationship in the old model says whether the
   downstream calls the upstream's API or subscribes to its events. Its
   architecture tests check the code against that.
3. **Severity of a policy's missing `execution`.** At design the gate requires
   `execution`, but the validator only warns.
4. **One level for the whole model.** In a model with several contexts, the
   contexts mature at different rates. A new context is dragged to the design
   requirements, or a designed one loses its aggregates.

## Decision

### 1. A term lists the words to avoid

```json
"language": [
  { "term": "Proxy", "meaning": "An outbound endpoint minted from a Pool for one customer.",
    "avoid": ["gateway", "reverse proxy"] }
]
```

- **Why the model carries it.** A Ubiquitous Language is defined by its
  distinctions as much as by its words. "Here we say *Proxy*, never *gateway*"
  is part of the language, not a code convention. This repo's own glossary
  (`CONTEXT.md`) already records an `_Avoid_` line for every term. The field
  takes that name.
- **Shape.** `avoid` is optional: a list of non-empty strings. A word appears
  once per term.
- **What goes in it.** Only words that can be searched for (a grep over code and
  docs). Explanations of what the term does not refer to belong in `meaning`.
- **Error.** An `avoid` word that is itself a `term` of the same context. The
  context would both use the word and forbid it. Words are compared
  case-insensitively.

### 2. Integration style is derived from the seams, never stored

Whether two contexts integrate by API or by events is a fact of the Context
Map. The model already holds its single source: the seams between the pair. A
stored `via` would be a second copy that can contradict the edges. So the style
is derived, and a reversed dependency is reported.

Every seam (decision-00017, issue-00040) has an integration style and a
dependency direction:

| Relation across contexts | Style | Upstream is the context of the |
|---|---|---|
| `triggers`, `updates`, `emits` | events | source (the downstream reacts to it) |
| `invokes`, `handledBy`, `produces`, `issues`, `constrainedBy` | api | target (the downstream calls it, or reads its state synchronously) |

- **Style of a relationship.** The validator reports, for each relationship, the
  styles its pair's seams use: `api`, `events` or both. That is the input for the
  downstream repo's architecture tests.
  - A pair with no seams yet has no derived style. At Context Map level that is
    expected; capture the question as a hotspot if it matters.
- **Reversed dependency (warning, `reversed-dependency`).** A directional
  relationship says `source` is upstream. The finding fires when a seam of
  that pair makes the declared upstream depend on the declared downstream.
  - Example: the upstream's policy `invokes` the downstream's command.
  - It is a warning, not an error. Upstream/downstream is partly a judgement
    of power and influence, and existing models commonly draw a generic
    service (`Notification`) as downstream although its callers depend on it.
- **When nothing is reported.**
  - A pair passes if any of its relationships points the derived way.
  - Symmetric types are never checked: `partnership`, `sharedKernel`,
    `separateWays`.
- **Mutual dependency (warning, `mutual-dependency`).** The seams of a pair
  depend both ways: each context reacts to or calls the other.
  - The warning fires unless the pair declares `partnership` or
    `sharedKernel`. DDD names mutual reliance Partnership: if either side
    fails to deliver, both do, so the teams plan together. It is a costly
    relationship and must be declared openly, never left implicit.
  - Without that declaration, the cycle means something is off. Either the
    direction can be straightened (one side calls, and the other replies on
    the same channel), or the boundary is wrong and the two are one context
    (B5).
  - A pair that is mutual gets this warning instead of `reversed-dependency`,
    because the fix is different. Adding a relationship each way does not
    silence it: two opposite customer/supplier relationships are the cycle
    stated twice, not resolved.
  - *Amended during implementation (plan-00026): the first draft let a
    relationship in each direction pass silently.*

### 3. A design-level policy without `execution` is an error

"Automatic or manual" is data the design level requires, not a judgement. This
is the same class as a missing `subdomain` or `purpose`.

- **Validator.** ERROR when the policy's level (§4) is `design`; a warning below
  design.
- **Editor.** Health warns `missing-execution` at design, keeping the existing
  split: editor warns, validator errors.
- **`condition` is unchanged.** A policy may have no condition.

### 4. A context carries its own level

Big Picture spans the whole domain. Process and Design are run per process and
per Bounded Context. So the level belongs to the context, and the model's level
is its ceiling.

```json
"meta": { "level": "design" },
"contexts": [
  { "id": "ord", "name": "Ordering", "order": 0, "...": "..." },
  { "id": "lgx", "name": "Logistics", "order": 1, "level": "big-picture", "...": "..." }
]
```

- **Shape.** `contexts[].level` is optional. Absent, the context is at
  `meta.level`.
- **The model's level caps it.** A context declared above `meta.level` is
  effectively at `meta.level`. This is not an error.
  - `meta.level` stays the editor's view filter, and switching the view writes
    it. Viewing the board at Big Picture must not make a model whose contexts
    reached Process invalid, nor lose their declared level.
  - Raising the view restores each context's own level.
  - *Amended during implementation (plan-00026): the draft made this an
    error, which the level switch would trigger on every downward view.*
- **Effective level.**
  - A node's effective level is the lower of its context's level and
    `meta.level`.
  - An Ungrouped node's is `meta.level`.
- **What uses it.** Everything that depends on level judges each element by its
  effective level, never by `meta.level` alone. This applies in the validator
  and in the editor's health, the same way:
  - **Node types.** A node type not allowed at its context's level is an
    error. A `big-picture` context cannot hold a command, even in a design
    model.
  - **Context requirements at design:** `subdomain` with `type`, and
    `purpose`.
  - **Element checks:**
    - `orphan-event` is exempt at `big-picture`;
    - `unguarded-aggregate` fires at `design` only;
    - a missing `execution` is an error at `design` (§3).
  - The editor's `orphan-event` gains this level exemption. Today it fires at
    every level, unlike the validator.
- **Single and split models behave identically.** A split model is merged into
  one model before any check runs (decision-00017).
- **Editor.** The context's `⋯` menu sets its level: `big-picture`, `process`,
  `design`, or "model's level" to clear it. All three are offered, since a level
  above the view is simply capped.
- **What the editor warns about.** In the editor, `type-above-level` reports a
  node whose type its context's *declared* level does not allow. A type above
  the model's level is the view's business: it is hidden, not reported, as it
  is today.

### Version

DSL `5.2`. `avoid` and `contexts[].level` are additive, and a `5.1` model
migrates by its version alone. The error for a design-level policy without
`execution` can reject a 5.1 file that validated before. That is intended: such
a file did not meet its own gate.

## Alternatives rejected

**A stored `via: api | events` on each relationship.** The downstream repo
asked for it, and it is a real Context Map fact. But the seams already hold it.
A second copy would need a consistency check against the seams anyway, and that
check is the derivation. A relationship with no seams yet has no style to state.

**`not` as the field name, holding words and sentences together.** It mixes two
things. Searchable words go in `avoid`; prose about what the term excludes goes
in `meaning`, where it is read.

**A reversed dependency as an error.** It would reject models that are
defensible. Many teams draw a shared generic service as downstream of its
callers, as a convention.

**A level per node.** It is finer than any session works. A Bounded Context is
the unit a Process or Design session takes up.

**Dropping `meta.level`.** The editor needs one view filter, and a model needs
one place that says how far it has come overall.

## Consequences

- **Schema.**
  - `termSchema` gains `avoid`;
  - `contextSchema` gains `level`;
  - `DSL_VERSION` becomes `5.2`, with migration `5.1 -> 5.2`.
- **Grammar.** `grammar.json` follows.
- **Validator.** `validate.py` changes:
  - `avoid` checks;
  - effective level everywhere level matters, and the context-level ceiling;
  - `execution` severity;
  - derived integration style per relationship in its report;
  - `reversed dependency` warning.
- **Editor health** (`analyzeModel`):
  - effective levels;
  - `missing-execution`;
  - `reversed-dependency`;
  - `orphan-event` level exemption.
- **Editor UI.** The `⋯` menu gets the context's level. Showing `avoid` and the
  derived style in the editor is out of scope.
- **Skill.**
  - `dsl.md`: the fields, the derivation table, the severities;
  - `context-map.md`: the `avoid` step, reading the derived style, and the
    reversed-dependency check in the gate;
  - `SKILL.md`: one model, contexts at their own level;
  - `process.md` and `design.md` gates.
- **`CONTEXT.md`.**
  - **Ubiquitous Language** mentions avoided words.
  - **Context Relationship** notes the derived style.
  - **DSL** or **Model** notes levels per context.
- **Examples.** They migrate to `5.2`. Any `reversed dependency` they reveal is
  fixed or recorded with its reason.
