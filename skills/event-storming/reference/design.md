# Phase 3 - Design

Goal: name the consistency boundary that owns each command, and the rules that can refuse it.

Adds: `aggregate` (the design output) and `constraint` (the design input). Keep everything from phases 1 and 2.

## Steps

Work command by command:

1. **Who owns the decision?** Add the `aggregate` that handles it: `command --handledBy--> aggregate`. Then refine the spine: `aggregate --emits--> domainEvent`. Keeping the old `command --produces--> domainEvent` edge alongside is allowed.
   Work done entirely outside the system: `command --handledBy--> externalSystem --emits--> domainEvent` instead. No aggregate.
2. **What can refuse it?** Every precondition, limit or permission that makes the command fail becomes a `constraint`, wired `command --constrainedBy--> constraint`, with `properties.rule` holding the invariant itself.
3. **Split what is overloaded.** An aggregate handling more than 5 commands or emitting more than 5 events is doing too much - ask whether it is really two.

Then raise `meta.level` to `"design"`, validate, run the gate.

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
- Are these two commands ever executed together and must not interleave? (same aggregate)
- Which of these rules is legal or regulatory, and which is a product choice?

## Gate

- [ ] Every command has `handledBy` to an aggregate or external system.
- [ ] Every aggregate emits at least one event, or the `produces` edge from its command still carries the spine.
- [ ] Every "you cannot X unless Y" rule is a constraint with a `rule`.
- [ ] No aggregate over the 5 commands / 5 events threshold without the user confirming it.
- [ ] Validator clean.
