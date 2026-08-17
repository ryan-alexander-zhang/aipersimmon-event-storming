# Phase 2 - Process

Goal: explain every event. What causes it, who decided, what information they needed, what reacts to it.

Adds: `command`, `policy`, `readModel`. Keep the phase 1 events and their `order` - do not renumber unless you add an event.

## Steps

Work event by event, in `order`. For each event ask the four questions:

1. **What command caused it?** Add `command --produces--> domainEvent`. If an outside system caused it instead: `command --handledBy--> externalSystem --emits--> domainEvent`, or just the external system emitting it.
2. **Who issues that command?** A person or role -> `actor --issues--> command`. An outside system asking us to act (a provider callback we may still refuse) -> `externalSystem --issues--> command`. Nobody -> it is automatic, so a policy invokes it (step 4).
3. **What does the actor need to know first?** -> `readModel`, wired `domainEvent --updates--> readModel --informs--> actor`.
4. **What reacts to this event automatically?** -> `policy`, wired `domainEvent --triggers--> policy --invokes--> command`.

Then raise `meta.level` to `"process"`, validate, run the gate.

## Policy parameters - do not skip

Every policy gets, when they exist:

- `condition` - the guard only, no "if": `"the rider has a valid payment method"`, `"retry attempts < maxRetries"`.
- `execution` - `automatic` (system reacts on its own) or `manual` (a human is asked to act).
- `parameters` - every threshold, timeout, limit, retry count, window or rate mentioned, as `{ "name": "...", "value": "..." }` string pairs.

Ask for the numbers. "Retry a few times" is not an answer: how many, how long between tries, then what? If the number is genuinely undecided, add a hotspot and leave the parameter out.

## Question bank

- What triggers `<command>` - a person or the system reacting?
- Who is allowed to do this? Are there several roles with different rights?
- What does `<actor>` look at before deciding?
- When `<event>` happens, what has to happen automatically?
- Under what condition does that reaction not fire?
- How long do we wait? How many times do we retry? What is the limit?
- Is this reaction automatic, or does someone have to click it?
- Which command can fail, and what event does the failure produce?

## Gate

- [ ] Every `domainEvent` has an incoming `produces` or `emits`.
- [ ] Every `command` has an `issues` from an actor or an external system, or an `invokes` from a policy.
- [ ] Every actor decision that needs data has a read model informing it.
- [ ] Every policy has `execution`, plus `condition` and `parameters` where they exist.
- [ ] Reaction loops are intentional (the validator flags policy cycles - confirm each one is a real retry loop with a bound).
- [ ] Validator clean.
