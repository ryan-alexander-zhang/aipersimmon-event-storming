# Phase 1 - Big Picture

Goal: the whole story as an ordered chain of domain events, with every unknown parked as a hotspot.

Allowed types: `domainEvent`, `actor`, `externalSystem`, `hotspot`, `opportunity`. No commands, no policies, no aggregates yet - if the user gives you one, note it and hold it for phase 2.

## Steps

**1. Discover (unordered).** Dump every event you can find. Sources, in order: the user's brief, repo code and docs, then the user. Do not order or connect anything yet. Aim wide, duplicates are fine.

**2. Grill.** Ask until the story runs end to end. See the question bank below.

**3. Converge (ordered).** Run every sticky through the event tests below (E1-E5). Move each one that fails to the type it really is, and tell the user which test it failed. Then deduplicate, rename to past tense, and sort into one global `order` from 0. Events that happen in parallel share one `order`. Do not apply the tests during step 1: filtering while people are still dumping silences them.

**4. Mark.** Set `pivotal: true` on the few events that pass P1 below (typically 3-7 on a board). Set `temporal: true` on events raised by time passing - a deadline elapsed, a period ended (see `reference/dsl.md`). Add hotspots and opportunities.

**5. Draft contexts.** Group events into candidate bounded contexts; write `contexts` and set `nodes[].context`. Subdomains and relationships come later - see `reference/context-map.md`.

**6. Write** with `meta.level: "big-picture"`, validate, show the timeline, run the gate.

## Is it a domain event?

A sticky stays a `domainEvent` only if it passes all five tests (decision-00018).

| Id | Test | Passes | Fails |
| --- | --- | --- | --- |
| E1 | **A fact, in the past tense.** It has happened. It can be compensated, never undone. | `Order Placed` | `Place Order`, `Ordering` |
| E2 | **In the domain's words.** A domain expert says it this way. No UI or technical vocabulary. | `Payment Captured` | `Button Clicked`, `Row Saved`, `Message Published` |
| E3 | **It changes the state of the business.** Something the business cares about is different afterwards. | `Seat Reserved` | `Order Viewed`, `Report Searched` |
| E4 | **Someone cares.** A policy reacts to it, a read model shows it, another context consumes it, or the business must keep it (audit, law). | `Invoice Overdue` (dunning starts) | an internal step nobody reacts to and nobody records |
| E5 | **Specific, one fact.** It says which change happened, and why. | `Shipping Address Corrected` | `Order Updated`; `Order Placed and Paid` (two events) |

To test E4, listen for the sentences Vernon names: "when that happens, ...", "if that happens, ...", "notify me if ...". An event nobody would say one of them about is noise.

### Where a rejected sticky goes

Never delete a rejected sticky. Move it, and name the test it failed: "`Order Viewed` fails E3, so it becomes a read model."

| The sticky is really | It becomes |
| --- | --- |
| a request or an intention (`Place Order`) | a `command`, held for phase 2 |
| reading or looking something up (`Order Viewed`) | a `readModel` in phase 2, or dropped |
| another system acting (`Payment Gateway Called`) | an `externalSystem`, plus the event it causes |
| a check that can refuse (`Check Credit`) | a `constraint` in phase 3 |
| a "whenever X, then Y" rule | a `policy` in phase 2 |
| time passing (`Day Ended`) | a `domainEvent` with `temporal: true` |
| UI or plumbing (`Button Clicked`) | dropped |
| unclear | a `hotspot` asking the question |

The validator warns `technical event` when an event's last word is `Created`, `Updated`, `Modified`, `Edited`, `Saved`, `Deleted`, `Clicked`, `Viewed`, `Fetched` or `Persisted` (E2, E5). Ask the user what happened in business terms. Keep the label only if that is the domain's own word.

### Pivotal events

**P1.** An event is pivotal when, after it, the work passes to other people, to other language, or to a phase that is hard to undo. Pivotal events are the first candidate boundaries for bounded contexts (`reference/context-map.md`, B2). Pivotal: `Order Placed` (the warehouse takes over, the customer can no longer edit the basket). Not pivotal: `Item Added to Cart` (same person, same phase, undone with one click).

Sources: Brandolini, *Introducing EventStorming*; Vernon, *Implementing Domain-Driven Design*, ch. 8.

## Question bank

- What starts this? What is the last event that means success?
- After `<event>`, what happens next? What happened just before `<event>`?
- What else can happen here - what goes wrong, what gets cancelled, rejected, expired, retried?
- Which of these can happen at the same time?
- Which events would the business notice if they stopped? After which one does someone else take over? (-> pivotal, P1)
- Who reacts when `<event>` happens? Who would want to be notified? (nobody -> fails E4)
- `<X> Updated` - what exactly changed, and why did it change? (-> E5)
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

- [ ] Every event passes E1-E5, and every sticky that failed was moved, not deleted.
- [ ] Every event has an `order`.
- [ ] The chain reads as one story with no missing step.
- [ ] Unhappy paths are present.
- [ ] Concurrency shown by shared `order`, not by invented order.
- [ ] Events that are the two ways one moment can go carry a shared `alternativeSet` - shared `order` alone does not say they are alternatives, and nothing will warn you if you leave it out.
- [ ] Pivotal events marked, each one passing P1.
- [ ] Every unknown or disagreement is a hotspot with `kind` and `priority`.
- [ ] Any hotspot you close during the session carries a `resolution` - what the answer/decision/mitigation was. Closing one with nothing written down loses why it was closed; the validator warns.
- [ ] Validator clean (`orphan-event` warnings are expected at this level - no commands exist yet).
