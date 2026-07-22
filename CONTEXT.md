# Event Storming Tool

The shared vocabulary for the Event Storming visual editor: the domain elements
users place on the canvas, the semantic relations that connect them, and the
export artifact. Keep this glossary-only — no implementation details or design
decisions. Definitions follow the [ddd-crew glossary](https://github.com/ddd-crew/eventstorming-glossary-cheat-sheet).

## Language

### Elements (canvas nodes)

**Domain Event**:
Something that already happened in the domain, named in the past tense (e.g.
"Order Placed"). The orange sticky; the backbone of the timeline.
_Avoid_: event (unqualified), message.

**Command**:
An intent, action, or decision that triggers a Domain Event, named in the
present tense (e.g. "Place Order"). The blue sticky.
_Avoid_: action, request.

**Actor**:
A person or role that issues a Command. The small yellow sticky.
_Avoid_: user, agent, persona.

**Aggregate**:
The consistency boundary you *design* to handle a Command and emit a Domain
Event — the design **output**. The large yellow sticky. Introduced at the Design
level.
_Avoid_: entity, model.

**Constraint**:
A restriction, rule, or precondition that must hold to perform a Command — the
design **input**. It constrains a Command; it never emits events. Distinct from
the Aggregate (input vs designed output). Introduced at the Design level.
_Avoid_: aggregate, validation, guard.

**Policy**:
A reaction rule of the form "when X happens, do Y" that connects a Domain Event
to a Command. The lilac sticky.
_Avoid_: rule, reactor, saga.

**Read Model**:
The information an Actor needs to decide on a Command. The green sticky.
_Avoid_: view, query model, projection.

**External System**:
An outside system the model interacts with as a black box. The pink sticky.
_Avoid_: third party, integration, service.

**Hotspot**:
A marked conflict, question, risk, or objection attached to any element. The
neon-pink sticky. Carries a **state** (open → resolved), a **kind** (conflict /
question / risk), and a **priority** (low / medium / high); absent state means
open.
_Avoid_: issue, note, problem.

**Opportunity**:
A marked idea, possibility, or value to pursue, attached to any element — the
positive counterpart to a Hotspot. Its own distinct sticky.
_Avoid_: idea, suggestion, hotspot.

**Pivotal Event**:
The few most significant Domain Events, marked with a vertical line. A marked
state of a Domain Event, not a separate element.
_Avoid_: milestone, key event.

### Relations (canvas edges)

Edges carry a **semantic type**, not just a geometric connection:

**issues**: Actor → Command.
**produces**: Command → Domain Event. The Process-level causal spine; at Design
it is refined by the Aggregate boundary (handledBy + emits).
**constrainedBy**: Command → Constraint.
**handledBy**: Command → Aggregate.
**emits**: Aggregate → Domain Event (also External System → Domain Event).
**triggers**: Domain Event → Policy.
**invokes**: Policy → Command.
**updates**: Domain Event → Read Model.
**informs**: Read Model → Actor.
**annotates**: Hotspot → any element.
**highlights**: Opportunity → any element.

### Structure

**Bounded Context**:
A named grouping of events on the single shared timeline, shown as a colour/region
attribute (e.g. Ordering, Payment) — not a segment of the timeline; contexts may
overlap in time (decision-00005).
_Avoid_: module, service, area.

**Subdomain**:
The strategic classification of a Bounded Context — **core** (a competitive
advantage, worth the most investment), **supporting** (needed but not
differentiating), or **generic** (a solved problem, buy or outsource). An optional
attribute on a Bounded Context; classification is not identity.
_Avoid_: domain, module, tier.

**Ungrouped**:
The state of an element that belongs to no Bounded Context. Ungrouped elements are
collected in a single soft group on the board and can be assigned to a context
later — context membership is optional.
_Avoid_: orphan, unassigned, none.

**Timeline**:
The single global left→right ordering of all Domain Events that forms the board's
spine, shared across every Bounded Context; every other element is placed relative
to the event it serves.
_Avoid_: flow, sequence (when precision matters).

**Walkthrough**:
A read-only traversal of the Timeline that steps through Domain Events in order,
highlighting each event's slice, to validate the flow by telling its story.
_Avoid_: playback, replay, tour.

**Discovery Mode**:
A Big-Picture-only exploration surface where a modeller freely places unordered
Domain Events at arbitrary positions, with relaxed grammar (no connections, no
timeline order). Its free positions are transient scratch state, never part of the
Model or the DSL.
_Avoid_: brainstorm, free canvas, chaos mode.

**Converge**:
The single action that turns the Discovery Mode wall into structured-board
elements: each unordered event becomes an ordinary Domain Event with a global
Timeline order derived from its left→right position, leaving Discovery Mode.
_Avoid_: promote, commit, import (when precision matters).

**Concurrent Events**:
Two or more Domain Events that occupy the same global timeline position because
they happen in parallel — including across different Bounded Contexts. They share
one column and stack in parallel sub-lanes.
_Avoid_: parallel events, simultaneous, same-slot (when precision matters).

### Artifacts

**Model**:
The whole Event Storming diagram — its elements, relations, and hotspots — as
held on the canvas and persisted locally.
_Avoid_: diagram, board, graph (when precision matters).

**DSL**:
The structured, validated JSON representation of a Model, used for export,
import, and local save. The single source of truth for the Model's shape.
_Avoid_: schema (that is the Zod definition of the DSL), export format.

## Example Dialogue

> **Dev**: When the Actor issues the "Place Order" Command, which sticky emits
> the "Order Placed" Domain Event?
>
> **Domain expert**: The Order Aggregate handles the Command and emits it. Then
> a Policy triggers on "Order Placed" and invokes the "Reserve Stock" Command.
>
> **Dev**: And the Actor needs the cart total to decide — that is a Read Model
> that informs them?
>
> **Domain expert**: Right. And put a Hotspot on "Reserve Stock" — we still
> argue about whether stock is reserved before or after payment.
