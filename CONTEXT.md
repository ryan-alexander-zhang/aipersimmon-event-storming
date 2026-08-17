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
Carries an optional **rule**: the invariant/assertion itself, distinct from the
prose description (spec-00011).
_Avoid_: aggregate, validation, guard.

**Policy**:
A reaction rule of the form "when X happens, do Y" that connects a Domain Event
to a Command. The lilac sticky. Carries optional **condition** (the guard "if"),
**execution** (automatic or manual), and **parameters** (named thresholds)
(spec-00011).
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

**Bounded Context Focus**:
A transient view that emphasises one Bounded Context: selecting it keeps that
context's slice (its members and their connected supporting elements) vivid while
the rest of the board dims, with any relation to another context (a seam) kept
highlighted. It dims, never hides — distinct from a filter (which hides elements)
and the Walkthrough (which steps through events). One focus, rendered per surface:
on the Context Map the same focused context keeps itself, the contexts one
relationship away and those relationships vivid while the other contexts dim.
_Avoid_: isolate, spotlight, filter.

**Isolate**:
A transient view that keeps only its **anchor**'s slice and **hides** everything
else, laying the survivors out as their own compact board so the space the hidden
elements vacated is reclaimed. The anchor is either an **element** — its slice is
everything reachable within a chosen number of hops, upstream, downstream, or both
— or a whole **Bounded Context**, whose slice is its members plus every element
directly related to one of them, so a relation to another context (a seam) keeps
the element on its far side and still reads as a relation. The anchor is pinned:
selecting another element inside the view reads that element without re-framing
the view. Distinct from **Bounded Context Focus** (which dims rather than hides and
never moves anything, even when both are anchored on the same context), from a
filter (which hides by attribute, not by reachability), and from the Walkthrough's
**Reading Scope** — that is the Walkthrough's own, keeps the whole Timeline, and
never touches this anchor; the two modes are never on the board together.
_Avoid_: focus mode, drill-down, neighbourhood filter.

**Timeline**:
The single global left→right ordering of all Domain Events that forms the board's
spine, shared across every Bounded Context; every other element is placed relative
to the event it serves.
_Avoid_: flow, sequence (when precision matters).

**Walkthrough**:
A read-only traversal of the Timeline that steps through Domain Events in order,
highlighting each event's slice, to validate the flow by telling its story.
_Avoid_: playback, replay, tour.

**Current Step**:
The one Domain Event a Walkthrough is on. It carries the **Step Ring** — the
marking that says "the Walkthrough is here", distinct from the selection outline
and the search-hit ring. The events behind the cursor are **Visited**, those ahead
are **Upcoming**; the three read differently on the board.
_Avoid_: current slide, active event, cursor (for the event itself), past/future.

**Reading Scope**:
How much of the board a Walkthrough shows around its Current Step, in relation hops
in either direction — one hop is the step's own slice. Every Domain Event is kept
whatever the scope, so the Timeline never leaves the board; everything else outside
the scope is hidden. It walks relations, not the Timeline, so an ordered neighbour
with no relation to the Current Step never enters it. The Walkthrough's own — it
neither reads nor moves Isolate's anchor.
_Avoid_: depth, radius, zoom, isolate depth.

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

**Context Relationship**:
A typed, directed integration relationship between two Bounded Contexts —
source = upstream, target = downstream. Uses the canonical DDD context-mapping
patterns: Partnership, Shared Kernel, Customer/Supplier, Conformist,
Anticorruption Layer, Open Host Service, Published Language, Separate Ways
(decision-00007).
_Avoid_: dependency, link, connection.

**Context Map**:
A bird's-eye view of the model's strategic design: each Bounded Context as a node
(with its Subdomain classification) and each Context Relationship as a directed
edge. A distinct view over the model — it never mutates the timeline board.
_Avoid_: architecture diagram, system map.

**Concurrent Events**:
Two or more Domain Events that occupy the same global timeline position because
they happen in parallel — including across different Bounded Contexts. They share
one column and stack in parallel sub-lanes.
_Avoid_: parallel events, simultaneous, same-slot (when precision matters).

### Artifacts

**Project**:
A named, browser-local workspace holding exactly one Model, its Discovery wall,
and its Snapshots. Everything a Modeler opens or edits belongs to one Project;
nothing is shared between them. Optionally linked to a Source File.
_Avoid_: workspace, document, file, board (for the container).

**Recent**:
The list of every stored Project, most-recently-opened first — where a Project is
created, reopened, or deleted.
_Avoid_: recent files, history, project list.

**Source File**:
The `.json` file a Project was imported from, when the browser can retain access
to it. Refreshing re-reads it and replaces the Project's Model; the tool never
writes back to it.
_Avoid_: linked file, path, attachment.

**Refresh**:
Re-reading a Project's Source File and replacing the Model with its contents.
The file wins; local changes are confirmed away first. Distinct from a browser
page reload, which restores a Project from local storage instead.
_Avoid_: reload, sync, re-import.

**Model**:
The whole Event Storming diagram — its elements, relations, and hotspots — as
held on the canvas and persisted locally.
_Avoid_: diagram, board, graph (when precision matters).

**DSL**:
The structured, validated JSON representation of a Model, used for export,
import, and local save. The single source of truth for the Model's shape.
_Avoid_: schema (that is the Zod definition of the DSL), export format.

**Snapshot**:
A named, timestamped copy of the whole Model captured at a point in time, kept on
its Project so a modeller can save an as-is version and return to it. Stored
outside the model DSL and never part of the current Model's export
(decision-00008, scoped to a Project by decision-00011).
_Avoid_: version (unqualified), backup, save.

**Version Compare**:
A read-only unified diff of two Snapshots (base → target, e.g. as-is → to-be): the
target's board with unchanged elements dimmed, added and changed elements
highlighted, and removed elements listed. A distinct view over the Snapshots — it
never mutates the live Model.
_Avoid_: merge, side-by-side.

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
