---
id: decision-00003-level-grammar-constraint-vs-aggregate
type: decision
role: main
status: active
parent: spec-00001-mvp-editor
---

# Element grammar is level-scoped; Constraint (input) and Aggregate (output) are distinct

## Context

The board's element grammar (decision-00002) hard-coded the full **Design-level**
causal chain as the *only* creation path and applied it at every level:

```
Actor → issues → Command → actsOn → Aggregate → produces → Domain Event
```

Three defects follow from that, confirmed against the
[ddd-crew EventStorming glossary](https://github.com/ddd-crew/eventstorming-glossary-cheat-sheet):

1. **You cannot create an Actor at Big Picture.** Creation is slice-driven and an
   Actor is only reachable via Command (`+ Actor (issues)`), which is hidden below
   Design; from a Domain Event at Big Picture you can only add a Hotspot.
2. **Every Domain Event must be produced by an Aggregate.** There is no direct
   `Command → Domain Event` relation, so the Process level cannot link a command
   to the event it causes without inventing an Aggregate.
3. **You must create an Aggregate before a Command** (`Domain Event → + Aggregate
   → + Command (handled by)`). This inverts the method: aggregates are the *last*
   thing determined, at Design.

The glossary is explicit on levels and on the aggregate:

- **Big Picture**: Domain Events, Actors, Systems, Hotspots/Opportunities, Pivotal
  Events, Swimlanes → emerging Bounded Contexts. No commands.
- **Process Modeling**: adds Commands, Policies, Query (Read) Models.
- **Design Level**: introduces the big-yellow, which the glossary now words as a
  *Constraint* — "a restriction we have or need to design … when we want to
  perform a command/action."

The glossary calls "aggregate" a legacy word for that big-yellow, but that
conflates two different things. In this project we keep them **distinct**:

- **Constraint = input.** A restriction / rule / precondition that must hold to
  perform a Command. Discovered or given from the problem space; it *constrains a
  Command*.
- **Aggregate = design output.** The consistency boundary you *design* to satisfy
  those constraints — the thing that handles a Command and emits a Domain Event.

Constraint drives the Aggregate; they are input and result, not synonyms.

## Decision

Make the grammar **level-scoped**, add a direct command→event spine, and model
Constraint and Aggregate as two distinct Design-level elements.

### Grammar by level (cumulative)

```
Big Picture   Domain Event (timeline) · Actor · External System · Hotspot
                 — no Command, no Constraint, no Aggregate —

Process       Actor —issues→ Command —produces→ Domain Event
              Domain Event —triggers→ Policy —invokes→ Command
              Domain Event —updates→ Read Model —informs→ Actor
              External System —issues→ Command / —emits→ Domain Event
                 — no Constraint, no Aggregate —

Design        Command —constrainedBy→ Constraint          (input: constrains the Command)
              Command —handledBy→ Aggregate —emits→ Domain Event   (output: designed boundary)
```

1. **`Command —produces→ Domain Event` is the causal spine** and exists from
   Process on. At Design it is *refined* by the Aggregate boundary
   (`Command → handledBy → Aggregate → emits → Domain Event`); the spine remains,
   levels decide what is shown.
2. **Constraint** is a new element, Design level, related by `constrainedBy`
   (`Command → Constraint`). It never emits events.
3. **Aggregate** stays the design-output boundary: `handledBy` from a Command,
   `emits` a Domain Event. It appears only at Design.
4. **Creation is level-aware and no longer aggregate-first.** Each level's own
   elements are directly creatable (a palette), and slice actions offer only the
   current level's grammar. From a Domain Event you add the Command that
   *produced* it; from a Command you add its Actor; Constraint/Aggregate appear
   only at Design.

## Consequences

- Refines decision-00002: its single Design-level grammar line and
  "slice-builder is the primary/only interaction" are replaced by the
  level-scoped grammar and palette-plus-slice creation above. decision-00002's
  structured-board invariants (derived layout, fixed bands, no free positioning)
  still hold.
- `relations.ts`: add `produces` (command→domainEvent) and `constrainedBy`
  (command→constraint); `handledBy` narrows to command→aggregate/externalSystem;
  `emits` stays aggregate/externalSystem→domainEvent.
- `elements.ts`: add the `constraint` element (own color + band).
- `levels.ts`: Design adds both `constraint` and `aggregate`; Big Picture /
  Process unchanged in visible types (the fix is creation reachability, not the
  filter).
- `us-00007` (slice editing) and `us-00008` (levels) are re-scoped to the
  level-aware grammar; `CONTEXT.md` gains **Constraint** and **produces**, and
  clarifies **Aggregate**.
- Implemented under plan-00006 in two phases (model core, then creation UI).
