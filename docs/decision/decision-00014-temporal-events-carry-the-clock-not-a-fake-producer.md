---
id: decision-00014-temporal-events-carry-the-clock-not-a-fake-producer
type: decision
role: main
status: active
parent: decision-00013-alternative-sets-recover-the-fork-the-layout-removed
---

# A time-raised event carries the clock itself, because a producer for it would be a lie

## Context

[decision-00013](./decision-00013-alternative-sets-recover-the-fork-the-layout-removed.md)
already enumerated the four sources of a Domain Event: a Command against an Aggregate, an
External System delivering an outside fact, **time passing**, and — at Big Picture —
nothing at all. Three of the four have a carrier in the DSL. Time passing has none:

- a Policy fires only from a `domainEvent —triggers→ policy` edge;
- a Command exists only issued by an Actor/External System or invoked by a Policy;
- and two independent checks assume every event has an on-board producer — the
  validator's `orphan-event` warning and the skill's Process gate ("every event has a
  producing command or external system").

So `Billing Month Ended` or `Hold Expired` — events canonical Event Storming marks with
a **calendar icon** (Brandolini, *Introducing EventStorming*, "Time-triggered events") —
can only pass the gate behind a fake `Clock`/`Scheduler` External System. That fake is
not a modelling shortcut but a wrong statement: an External System is an outside black
box we integrate with; a calendar is not, and the fake node shows up as a context seam
that does not exist.

Note what is *not* missing: a deadline the system itself runs is already expressible —
`Booking Held —triggers→ Hold Expiry Policy` (condition `not confirmed within
holdWindow`, parameter `holdWindow`) `—invokes→ Expire Hold —produces→ Hold Expired`.
The gap is only the moment where the clock itself is the source: a calendar date, a
recurring schedule, an outside-world deadline no command of ours enforces.

## Decision

A new optional boolean property on `domainEvent`:

```json
{ "type": "domainEvent", "label": "Billing Month Ended", "order": 0,
  "properties": { "temporal": true } }
```

`temporal: true` states: **this event is raised by time passing** — a deadline reached,
a date arrived, a schedule fired. Consequences:

- The event is exempt from the producer expectation: no `orphan-event` finding in the
  editor, no `orphan event` warning from `validate.py`, and the skill's Process gate
  accepts it as source-complete.
- Everything else about it is an ordinary Domain Event: it carries `order`, may be
  `pivotal`, may join an `alternativeSet`, and triggers Policies like any other event.
- The editor renders a clock badge on the sticky (the DSL's form of the calendar icon)
  and offers a checkbox beside *Pivotal event* in the property panel.

The property is additive and optional; the DSL stays `4.0` (precedent: spec-00011's
policy/constraint properties, decision-00013's `alternativeSet`).

## Alternatives rejected

- **A temporal trigger on the Policy** (`trigger: "temporal"`). Models the scheduler,
  not the moment, and puts the mark on the wrong element: canon draws the calendar on
  the *event*. It also leaves Big Picture uncovered — no policies exist there, yet
  "the review window closed" is a Big Picture sentence.
- **A new element type** (clock/timer sticky). No such sticky exists in the method, and
  a new type touches level gating, bands, grammar.json and every table for a marker
  that one boolean carries.
- **Relaxing the producer checks for all events.** Throws away the check that catches
  genuinely forgotten producers — the majority case the warning exists for.

## Consequences

`web/lib/dsl/schema.ts`, `serialize.ts`, `diff.ts`, `analysis/health.ts`,
`property-panel.tsx`, the node renderers, the skill's `validate.py` and reference docs,
and `CONTEXT.md` all learn the property together; the fix and its regression tests are
tracked in
[issue-00039](../issue/issue-00039-a-time-raised-event-cannot-exist-without-a-fake-producer.md).
