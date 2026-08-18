---
id: us-00035-alternative-sets
type: us
role: main
status: resolved
parent: spec-00011-structured-rule-expression
---

# User Story: mark things that happen instead of each other

As a Modeler,
I want to say that two Domain Events or two Commands are alternatives — at most one of them
happens,
so that a fork reads as a fork on a board that has no room left to draw one.

> Replaces [us-00034](./us-00034-policy-branch-dispatch.md), which put the marker on the
> Policy as `dispatch`. Design and reasoning in
> [decision-00013](../decision/decision-00013-alternative-sets-recover-the-fork-the-layout-removed.md):
> a wall carries the fork in its *shape*, and this editor deleted free geometry
> (decision-00002, decision-00005), so the fork has to be data. It cannot hang on the
> Command, because a Domain Event's fork often has no element to hang on — Big Picture has
> no Commands at all, an outside fact has no Aggregate, a timeout has nothing.

## Requirements (EARS)

- **us-00035-FR-1** (Event) When the Modeler puts two or more Domain Events or Commands in
  the same **alternative set**, the system shall store that membership and show on each
  member that it is one of several alternatives.
- **us-00035-FR-2** (Ubiquitous) An alternative set shall mean *at most one of its members
  happens*, and its membership shall be the key alone — never derived from edges, from
  `order`, or from a shared cause — so that it holds at Big Picture, for an outside fact,
  and for a timeout.
- **us-00035-FR-3** (Ubiquitous) A set shall be allowed to mix Domain Events and Commands,
  because "either the customer confirms or the hold expires" is one fork.
- **us-00035-FR-4** (Ubiquitous) `alternativeSet` shall be optional and legal only on Domain
  Event and Command — the two element types that represent something happening at a moment;
  an element with no set shall behave and render as it does today.
- **us-00035-FR-5** (Ubiquitous) The system shall carry `alternativeSet` through export and
  import with the rest of the Model, and shall read a Model without it — every Model written
  before this story — without error.
- **us-00035-FR-7** (Unwanted) If an alternative set has only one member, then the system
  shall raise it as a model-health finding, because one thing cannot happen instead of
  itself.
- **us-00035-FR-8** (Ubiquitous) The system shall not evaluate a set, choose a branch, or
  infer one: a set is the Modeler's statement, and the system shall not raise a finding for a
  moment whose several outcomes are undeclared, because a fan-out is often legitimately "all
  of them".

> **Amended 2026-08-18, after the first real model met it.** FR-6 originally required a
> health finding for "a single moment with several outcomes and no alternative set", built
> and shipped as `undeclared-alternatives`. It was withdrawn the same day: `ftgo`'s
> `Create Order Saga` invokes `Create Ticket` **and** `Authorize Card` — both fire, in
> sequence — and with `Policy.dispatch` gone there is no way to state that positively, so the
> finding asked a question the model could not answer and nagged a correct example forever. A
> finding that fires on correct models teaches people to ignore model health. The question
> now lives in the authoring skill's interview (`reference/process.md`) instead, where it
> belongs: ask the Modeler, do not flag the model. AC-4.1 / AC-4.2 / AC-4.3 were withdrawn
> with it.

## Acceptance (GWT)

- **us-00035-AC-1.1** (us-00035-FR-1)
  Given two Domain Events that are the success and the failure of one attempt
  When the Modeler puts both in the alternative set "charge-outcome"
  Then the model stores the set on both
  And each one shows that it is one of several alternatives
- **us-00035-AC-1.2** (us-00035-FR-1)
  Given a Domain Event in an alternative set
  When the Modeler clears its set
  Then it no longer shows the marker
- **us-00035-AC-2.1** (us-00035-FR-3, us-00035-FR-4)
  Given a Command and a Domain Event
  When the Modeler puts both in one alternative set
  Then the model stores it for both, and the set is not rejected
- **us-00035-AC-3.1** (us-00035-FR-5)
  Given a Model with an alternative set spanning two Domain Events
  When it is exported and imported again
  Then the set survives unchanged on both
- **us-00035-AC-3.2** (us-00035-FR-5)
  Given a Model exported before this story
  When the Modeler imports it
  Then it loads without error
  And nothing on it belongs to an alternative set
- **us-00035-AC-5.1** (us-00035-FR-7)
  Given an alternative set with exactly one member
  When model health is analysed
  Then it is reported

## Out of scope (recorded)

- Drawing the fork. The board is a deterministic banded layout; the set is read from the
  members, not from the shape (decision-00013).
- Deriving membership from `order`, from edges, or from a common cause — deliberately not
  done, so that the set works where the moment has no element.
- CML's third operator, `inclusive` ("one or more, not necessarily all").
- Guard text on edges: rejected in decision-00012 and again in decision-00013.
- Any evaluation, simulation or branch selection.

## Links

- Spec: spec-00011-structured-rule-expression ·
  Decision: decision-00013-alternative-sets-recover-the-fork-the-layout-removed ·
  Replaces: us-00034-policy-branch-dispatch
