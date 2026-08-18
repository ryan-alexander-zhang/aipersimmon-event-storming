# Phase 1 - Big Picture

Goal: the whole story as an ordered chain of domain events, with every unknown parked as a hotspot.

Allowed types: `domainEvent`, `actor`, `externalSystem`, `hotspot`, `opportunity`. No commands, no policies, no aggregates yet - if the user gives you one, note it and hold it for phase 2.

## Steps

**1. Discover (unordered).** Dump every event you can find. Sources, in order: the user's brief, repo code and docs, then the user. Do not order or connect anything yet. Aim wide, duplicates are fine.

**2. Grill.** Ask until the story runs end to end. See the question bank below.

**3. Converge (ordered).** Deduplicate, rename to past tense, sort into one global `order` from 0. Events that happen in parallel share one `order`.

**4. Mark.** Set `pivotal: true` on the few events that change the state of the business (typically 3-7 on a board). Add hotspots and opportunities.

**5. Draft contexts.** Group events into candidate bounded contexts; write `contexts` and set `nodes[].context`. Classification and relationships come later - see `reference/context-map.md`.

**6. Write** with `meta.level: "big-picture"`, validate, show the timeline, run the gate.

## Question bank

- What starts this? What is the last event that means success?
- After `<event>`, what happens next? What happened just before `<event>`?
- What else can happen here - what goes wrong, what gets cancelled, rejected, expired, retried?
- Which of these can happen at the same time?
- Which events would the business notice if they stopped? (-> pivotal)
- Who or what outside our system causes this event?
- Which of these events belong to a different team, product or system? (-> context split)
- Where are you unsure or where do people disagree? (-> hotspot)

Ask about the unhappy path explicitly - it is the part people forget.

## Edges at this level

Almost none. Only these are legal here:
- `externalSystem --emits--> domainEvent`

Two events that are the two ways one moment can go (`Payment Captured` / `Payment Declined`) are alternatives even here, where there are no commands to hang that on: give them the same `alternativeSet` key. See `reference/dsl.md`.
- `hotspot --annotates--> <any node>`
- `opportunity --highlights--> <any node>`

The timeline is carried by `order`, not by edges. Do not invent event-to-event edges; they do not exist.

## Gate

- [ ] Every event is past tense and has an `order`.
- [ ] The chain reads as one story with no missing step.
- [ ] Unhappy paths are present.
- [ ] Concurrency shown by shared `order`, not by invented order.
- [ ] Events that are the two ways one moment can go carry a shared `alternativeSet` - shared `order` alone does not say they are alternatives.
- [ ] Pivotal events marked.
- [ ] Every unknown or disagreement is a hotspot with `kind` and `priority`.
- [ ] Any hotspot you close during the session carries a `resolution` - what the answer/decision/mitigation was. Closing one with nothing written down loses why it was closed; the validator warns.
- [ ] Validator clean (`orphan-event` warnings are expected at this level - no commands exist yet).
