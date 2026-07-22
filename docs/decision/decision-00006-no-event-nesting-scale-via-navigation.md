---
id: decision-00006-no-event-nesting-scale-via-navigation
type: decision
role: main
status: active
parent: prd-00002-complex-business-analysis
---

# Scale is addressed by navigation, not by nesting a board inside a Domain Event

> Corrects [prd-00002](../prd/prd-00002-complex-business-analysis.md) FR8 and
> re-scopes [spec-00006](../spec/spec-00006-scale-navigation-nesting.md).
> Supersedes the "event drill-down (nesting)" direction sketched in
> [analysis-00002](../analysis/analysis-00002-complex-business-analysis-gaps.md) §6.

## Context

prd-00002 FR8 and spec-00006 proposed *"drill from a Big Picture Domain Event
into a nested Process-level board scoped to that event, and back."* On review this
rests on a mistaken mental model of Event Storming.

A **Domain Event is an instantaneous fact** ("something happened"), not a container
of a sub-process. Events that occur before/after it are its **timeline neighbours**
linked by causality, not children nested inside it. So "a board inside an event"
has no coherent meaning:

- Interpreting the interior as *the event's producing mechanism* (Command /
  Aggregate / Policy) is redundant — those already appear by switching **Level**
  (Big Picture ⊂ Process ⊂ Design is a view filter over the same model,
  `web/lib/eventstorming/levels.ts`); there is nothing extra to "drill" into.
- Interpreting a Big Picture event as a *summary that expands into finer
  sub-events* contradicts the method: Event Storming exists to lay events out one
  by one, not to fold a stretch of flow into a single event.

Evidence: the three Event Storming "levels" are **separate workshops at different
granularity** (Big Picture → Process → Design), not a nesting UI. Process-level
zooms into **one process / a region of the timeline** — framed by **pivotal
events** (subdomain transitions) — as its own focused session. No canonical source
describes nesting sub-events inside a Domain Event. (Brandolini's method; corroborated
by Baeldung "Event Storming Workshop", Qlerify "Event Storming — The Complete Guide",
Jerome Boyer's EDA studies on pivotal events.)

## Decision

1. **Drop event-level nesting.** No "drill into a Domain Event → nested board"
   feature, and no per-event hierarchy field in the DSL. The board stays flat.
2. **Address scale with navigation only (FR7).** Deliver search + filter (by text
   / type / Bounded Context) and minimap navigation over the existing single flat
   model. This is UI-only; it does not touch the DSL.
3. **Defer true multi-level decomposition.** If hierarchical decomposition is ever
   wanted, the Event-Storming-faithful unit is a **region / pivotal-event slice /
   Bounded Context** detailed on its own focused Process board — *not* a single
   event. That is a larger, separate effort and is out of scope for this phase.

## Consequences

- prd-00002 FR8 is retired; the capability-table row #6 becomes "navigation at
  scale (search / filter / minimap)". FR7 stands unchanged.
- spec-00006 is re-scoped to FR7 only (search / filter / minimap); it introduces
  **no new DSL version and no migration**.
- CONTEXT.md gains no "Drill-down / Nested board" term (the skeleton had flagged
  one); it is not a concept in this product.
- analysis-00002 §6's "事件级下钻(层级模型)" direction is marked reassessed here.
