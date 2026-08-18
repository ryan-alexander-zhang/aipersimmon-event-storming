---
id: decision-00012-branching-as-policy-dispatch-not-edge-guards
type: decision
role: main
status: active
parent: spec-00011-structured-rule-expression
---

# Branching is an exclusivity marker on the Policy, not a guard on the edge

## Context

A Policy that reacts to one Domain Event may lead to different Commands depending
on a condition — "if the amount is over the threshold, send it to manual review,
otherwise approve it". The board can already draw both `invokes` edges, but nothing
says the two are **alternatives**: every relation in this DSL reads as "and", so two
`invokes` read as "both Commands happen". The condition has a home
(`Policy.condition`, us-00026); the exclusivity does not.

The same ambiguity exists on `emits` (a success event vs a failure event) and on any
element with several outgoing edges of one relation. It is not specific to Policy.

### What comparable notations do

- **Canonical Event Storming** (Brandolini; the
  [ddd-crew glossary](https://github.com/ddd-crew/eventstorming-glossary-cheat-sheet))
  has **no branching notation at all**. A Policy is "whenever X happens, we do Y".
  Branches are handled by *process*, not notation: "postpone branches", finish the
  most valuable path, mark the others as Hotspots and come back.
- **Event Modeling** (Dymitruk) makes the timeline explicitly forward-only with no
  branching logic — a storyline by example, because people remember stories, not
  graphs.
- **Domain Storytelling** models the happy path and puts alternative scenarios in
  *separate stories*.
- **Qlerify** (a commercial Event Storming tool) uses a Decision/Policy sticky **only
  at a branching point**, and otherwise attaches a Given-When-Then condition to the
  next event.
- **Context Mapper's CML** is the one formalisation with real branch semantics, and it
  borrows BPMN's gateways: a flow step carries `+` (all), `X` (exactly one), or `O`
  (one or more) over its set of emitted events / triggered commands. The operator sits
  on the **step**, over the whole set — not on individual arrows — and CML does not
  express the condition at all, only the exclusivity.
- **BPMN** is the opposite pole: conditions live on the outgoing sequence flows, and
  every gateway but the parallel one requires them.

## Decision

Follow CML: express branching as an **exclusivity marker on the element**, and keep the
condition text where it already lives.

- A Policy gains an optional `dispatch` attribute: `"parallel"` (default — all the
  Commands it invokes) or `"exclusive"` (exactly one of them). Absent means parallel,
  so every existing model keeps its meaning.
- The condition stays `Policy.condition`, with thresholds in `parameters` (us-00026).
- `dispatch` is a Policy attribute for now. `emits` and `produces` have the same
  ambiguity and are deliberately **not** covered yet (us-00034 records it); the enum
  leaves room for CML's `inclusive` later.

### Rejected: a guard on the edge

Putting condition text on the `invokes` edges (BPMN's model) was rejected:

1. It turns the board into a flowchart — the thing Event Storming, Event Modeling and
   Domain Storytelling all deliberately avoid.
2. Edges here are pure typed relations with no attributes; giving them data means DSL,
   validation, edge rendering and labelling all change, for one feature.
3. CML, the closest formal analogue to this DSL, declined to do it too: exclusivity is
   structural and belongs to the model; the guard is prose and belongs to the rule.

### Rejected: one Policy per branch as the only answer

It stays *legal* and remains right when the branches are genuinely different rules. But
forcing it means a sticky per `if`, and Qlerify's practice shows the other reading is
just as legitimate: one Policy **is** the decision point.

## Consequences

- Two `invokes` on a Policy with no `dispatch` are still ambiguous in old models, so
  model health raises it as an advisory finding rather than the app guessing.
- "Concurrent" and "mutually exclusive" remain conflated on the timeline (equal `order`
  means both), including in the skill's reference, which calls
  `Payment Captured` / `Payment Failed` "parallel outcomes". Extending `dispatch` to
  `emits` is the fix, and it is not in this decision.
- No rule evaluation, now or later, from this decision: `dispatch` is documentation the
  model can carry, not behaviour the app simulates.
