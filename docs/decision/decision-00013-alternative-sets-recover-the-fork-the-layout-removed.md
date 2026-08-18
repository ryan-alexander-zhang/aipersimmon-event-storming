---
id: decision-00013-alternative-sets-recover-the-fork-the-layout-removed
type: decision
role: main
status: active
parent: spec-00011-structured-rule-expression
---

# Mutual exclusion is a named set over the things that happen, because our layout deleted the fork

> Supersedes [decision-00012](./decision-00012-branching-as-policy-dispatch-not-edge-guards.md),
> which put the marker on the Policy as `dispatch`. Its rejection of edge guards stands;
> its carrier was wrong.

## Context

Two Commands invoked by one Policy, or two Domain Events that are the success and the
failure of one attempt, are *alternatives* — at most one of them happens. Nothing in the
model says so, and a reader (a person, an LLM continuing the model, any future generator)
has no way to tell them from two things that both happen.

### Why canonical Event Storming needs no notation, and why we do

On a wall the fork is **spatial**: the alternatives branch from one point and each path
runs to its own stable end, while genuinely concurrent events sit side by side in the same
time band and both continue forward. The distinction is carried by the *shape*, which is
why Brandolini's method, the ddd-crew glossary, Event Modeling and Domain Storytelling all
get by without any exclusivity marker — and why they instead spend their guidance on
*process*: happy path first, ask "what if", keep the unexplored branch as a Hotspot.

This editor deliberately removed that carrier. [decision-00002](./decision-00002-structured-board-not-free-canvas.md)
replaced the free canvas with a deterministic banded layout, and
[decision-00005](./decision-00005-global-timeline-bc-as-region.md) put every element on one
global timeline where equal `order` means one column, stacked. There is no fork left to
draw. The information a physical board holds in its geometry therefore has to be held here
as data — not because the method asks for it, but because we took away the place it used
to live.

### Where the exclusivity belongs

Reasoning from the method rather than from any existing model file:

1. **A Domain Event has four sources**: a Command against an Aggregate, an External System
   delivering an outside fact, time passing, and — at Big Picture — nothing at all, because
   Commands do not exist yet at that level. Anchoring exclusivity on the Command covers one
   of the four, and fails precisely where branches are first discussed: "what if the payment
   fails?" is a Big Picture question.
2. **What forks is a moment, not an element.** Someone attempted something, or something
   was awaited, and reality went one of several ways: accepted / refused, captured /
   declined, arrived in time / deadline elapsed. The alternatives belong to *that moment*.
3. **That moment is often not on the board.** It is at Process and Design level, as the
   Command or the Policy; it is absent at Big Picture, absent for an outside fact, and
   absent for a timeout. Nothing exists to hang the marker on.
4. Therefore the only carrier available in every case is **the set of outcomes itself**.

Context Mapper's CML — the formalisation this DSL otherwise follows, with its `+` / `X` /
`O` operators — hangs them on a *flow step* (`command … delegates to … emits event A X B`).
That works because CML **has** a step object and does not model Big Picture at all. We have
neither, so the CML precedent does not transfer to the carrier, only to the idea.

## Decision

An **Alternative Set**: a named set whose members are mutually exclusive — at most one of
them happens.

- Any Domain Event or Command may carry an optional `alternativeSet` key. Members are the
  elements sharing that key. Two element types only, and for one reason: they are the two
  that represent *something happening at a moment* (an event happened; a command was
  issued). An Aggregate, a Read Model or a Constraint does not happen, so it cannot be an
  alternative.
- Membership is deliberately **not** derived from edges, `order`, or a common cause. It
  holds at Big Picture with no Commands on the board, for an outside fact with no Aggregate,
  and for a timeout with no element at all.
- **Mixed sets are legal**: "either the customer confirms (Command) or the hold expires
  (Domain Event)" is a real fork, and forbidding it would only serve tidiness.
- Nothing evaluates it. It records what the fork is; the app never chooses a branch.
- `Policy.dispatch` (decision-00012) is **removed** in favour of this: a Policy's branch is
  the set over the Commands it invokes. One concept instead of two, and the one that also
  works where the moment is absent. It cost a day and nothing outside this repo consumed it.

### What is given up by dropping `dispatch`

`dispatch: "parallel"` could state positively "I considered these and they all fire". A set
can only say "these are alternatives"; silence covers both "they all fire" and "nobody
thought about it".

**Model health therefore does not ask.** It was built to ask — a finding for a moment with
several undeclared outcomes — and withdrawn the same day, when `ftgo`'s `Create Order Saga`
(which invokes two Commands that both fire, in sequence) showed that the question has no
answer the model can record. A finding that fires on correct models trains people to ignore
model health, and a fan-out is legitimate often enough that flagging it is wrong by default.
Health says only that a set of one member is not a set; the question — "do these all happen,
or one instead of the others?" — belongs to the authoring interview, which is where the
method puts it too. If the affirmation is ever wanted back, it returns as a second concept,
knowingly.

### Rejected, again: a guard on the edge

Unchanged from decision-00012: conditions on `invokes` / `produces` edges is BPMN's model,
turns the board into a flowchart, and needs attributes on edges that are otherwise pure
typed relations. The guard text stays `Policy.condition`.

## Consequences

- The fork is data, never geometry: two alternatives still share a column when they share
  `order`, and the set is what tells them apart. Drawing the fork is not attempted.
- `order` keeps meaning "same point on the timeline" and stays silent about exclusivity;
  an Alternative Set is now the thing that says "one of these", including across `order`
  values when one branch resolves later than the other.
- A model written with `Policy.dispatch` still imports: unknown properties are stripped by
  the schema, so the field is silently dropped rather than rejected.
