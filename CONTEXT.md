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
neon-pink sticky.
_Avoid_: issue, note, problem.

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

### Structure

**Bounded Context**:
A named grouping of a slice of the model that forms one column group along the
timeline (e.g. Ordering, Payment). The board's columns are organized by it.
_Avoid_: module, service, area.

**Ungrouped**:
The state of an element that belongs to no Bounded Context. Ungrouped elements are
collected in a single soft group on the board and can be assigned to a context
later — context membership is optional.
_Avoid_: orphan, unassigned, none.

**Timeline**:
The left→right ordering of Domain Events that forms the board's spine; every
other element is placed relative to the event it serves.
_Avoid_: flow, sequence (when precision matters).

**Concurrent Events**:
Two or more Domain Events that occupy the same timeline position because they
happen in parallel. They share one column and stack in parallel sub-lanes.
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
