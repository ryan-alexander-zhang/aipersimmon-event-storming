# Phase 3 - Design

Goal: name the consistency boundary that owns each command, and the rules that can refuse it.

Adds: `aggregate` (the design output) and `constraint` (the design input). Keep everything from phases 1 and 2.

Asked for Design straight after Big Picture? Run phase 2 (`reference/process.md`) in this same pass - the grammar is cumulative and both gates still apply; only the ceremony of a separate round is skipped.

## Steps

Work command by command, behaviour first (G1): gather each command, the events it produces and the constraints that can refuse it before naming any aggregate.

1. **What can refuse it?** Every precondition, limit or permission that makes the command fail becomes a `constraint`, wired `command --constrainedBy--> constraint`, with `properties.rule` holding the invariant itself.
2. **Who owns the decision?** Group the commands by the rules they share (G2), then name the group. Add the `aggregate` that handles it: `command --handledBy--> aggregate`. Then refine the spine: `aggregate --emits--> domainEvent`. Keeping the old `command --produces--> domainEvent` edge alongside is allowed.
   Work done entirely outside the system: `command --handledBy--> externalSystem --emits--> domainEvent` instead. No aggregate.
3. **Check the size.** An aggregate handling more than 5 commands or emitting more than 5 events is a signal, not a rule (G3). Ask which rule all its commands share. If there is none, it is two aggregates.

Then raise `meta.level` to `"design"`, validate, run the gate.

## What an aggregate holds

| Id | Rule | Example | Counter-example | Ask |
| --- | --- | --- | --- | --- |
| G1 | **Behaviour first, name last.** Gather commands, events and constraints first. Name the aggregate only once the group is stable. | `Place Order` + `Item in stock` + `Order Placed`, then named `Order` | Start from a `Customer` noun and hang every command on it | Which commands share this rule? |
| G2 | **The boundary is a true invariant.** Two commands belong to one aggregate when one rule must hold across both, at the same moment. If they share no rule, they belong to separate aggregates. | `Start Trip` and `End Trip` share "steps in order": one `Trip` | `Register User` and `Post Message` share nothing: two aggregates | Which rule must hold, whichever of these runs? |
| G3 | **Small.** Split off a part that has its own lifecycle, or that two actors change at the same time. | `Payment Method` lives apart from each `Payment` | One `Order` holding every shipment and every return | Can two people change this at once? Does this part live and die on its own? |
| G4 | **Reference by id.** An aggregate never contains another. | `Backlog Item` holds `sprintId` | `Sprint` holds its backlog items | Does this need the other thing, or only to point at it? |
| G5 | **Eventual consistency between aggregates.** A rule that spans two aggregates is a `policy` that reacts to an event and corrects afterwards, not one transaction. | `Card Declined` -> `Reject on Decline Policy` -> `Reject Order` | `Place Order` constrained by the customer's card balance | How soon must this be true - at once, or soon after? ("soon" -> policy) |
| G6 | **One context.** An aggregate lives in exactly one context. A rule that needs two contexts sends you back to the Context Map. | `Fare Statement` in Billing only | `Item in stock` on `Place Order` in Ordering, while no context owns stock (the template raises it as a hotspot) | Does this rule need data another context owns? |

An aggregate's invariants are the constraints on the commands it handles. An aggregate none of whose commands has a constraint protects nothing: it is a CRUD container, or its rules are missing. The validator warns `unguarded aggregate` at `design`.

Sources: Vernon, *Effective Aggregate Design* (parts I-III); ddd-crew, *Aggregate Design Canvas*; Brandolini, *Introducing EventStorming*.

## Aggregate vs constraint

- Aggregate = the thing that decides and changes state. A noun the business owns: `Order`, `Trip`, `Fare Statement`.
- Constraint = the rule checked before deciding. It never emits an event, it only blocks a command.

If it can be phrased as "you cannot X unless Y", it is a constraint.

## Constraint rule

`properties.rule` is the assertion, not prose. `description` explains why it exists.

```json
{ "properties": { "rule": "order total <= customer credit limit",
                  "description": "Finance caps unsecured exposure per customer." } }
```

Ask for the exact form: which field, which comparison, which limit. Undecided -> hotspot, and leave `rule` out.

## Question bank

- Which thing in the domain owns this decision - what is its name?
- What state does it protect? What must never be true of it?
- When is `<command>` rejected? By what check?
- Who or what enforces that rule - us or an external system?
- Is `<aggregate>` really one thing, or two that happen to share a name?
- Are these two commands ever executed together and must not interleave? (same aggregate, G2)
- Which rule do `<command A>` and `<command B>` share? (none -> separate aggregates, G2)
- If this rule is broken for a few seconds, what happens? (nothing serious -> policy between aggregates, G5)
- Does this rule need data that another context owns? (yes -> revisit the Context Map, G6)
- Which of these rules is legal or regulatory, and which is a product choice?

## Gate

- [ ] Every command has `handledBy` to an aggregate or external system.
- [ ] Every aggregate emits at least one event, or the `produces` edge from its command still carries the spine.
- [ ] Every "you cannot X unless Y" rule is a constraint with a `rule`.
- [ ] Every aggregate guards at least one constraint (else the validator warns `unguarded aggregate`), and its commands share a rule (G2).
- [ ] Every rule spanning two aggregates is a policy (G5); none spans two contexts (G6).
- [ ] No aggregate over the 5 commands / 5 events threshold unless the user named the rule its commands share.
- [ ] Validator clean.
