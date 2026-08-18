---
id: us-00034-policy-branch-dispatch
type: us
role: main
status: archived
parent: spec-00011-structured-rule-expression
---

> **Superseded by [us-00035](us-00035-alternative-sets.md)** per
> [decision-00013](../decision/decision-00013-alternative-sets-recover-the-fork-the-layout-removed.md).
> It shipped `Policy.dispatch`, which was then removed: a Domain Event's fork often has no
> element to carry a marker, so exclusivity became a named set over the outcomes, and a
> Policy's branch is the set over the Commands it invokes. Kept for history; the acceptance
> evidence in [record-00024](../record/record-00024-policy-branch-dispatch-acceptance.md)
> describes the mechanism as it was.

# User Story: a Policy says whether its Commands are alternatives

As a Modeler,
I want a Policy to say whether the Commands it invokes all happen or only one of them
does,
so that a conditional branch reads as a branch instead of looking like two reactions
that both fire.

> Extends [us-00026](./us-00026-policy-rule-detail.md), which gave a Policy its
> `condition`, `execution` and `parameters`. The guard text has a home; the exclusivity
> does not, so "if over the threshold review it, otherwise approve it" is indistinguishable
> from "review it *and* approve it". Design chosen in
> [decision-00012](../decision/decision-00012-branching-as-policy-dispatch-not-edge-guards.md):
> an exclusivity marker on the Policy, as Context Mapper's CML does — not a guard on the
> edge, which is BPMN's model and turns the board into a flowchart.

## Requirements (EARS)

- **us-00034-FR-1** (Event) When the Modeler sets a Policy's `dispatch` to `exclusive`,
  the system shall store it and show on the Policy that exactly one of the Commands it
  invokes happens.
- **us-00034-FR-2** (Ubiquitous) `dispatch` shall be optional and shall default to
  `parallel` — all the Commands the Policy invokes; a Policy with no `dispatch` shall
  behave and render exactly as it does today.
- **us-00034-FR-3** (Ubiquitous) The system shall carry `dispatch` through export and
  import with the rest of the Model, and shall read a Policy with no `dispatch` — every
  Policy written before this story — without error.
- **us-00034-FR-4** (Unwanted) If a Policy invokes more than one Command and has no
  `dispatch`, then the system shall raise it as a model-health finding, because the
  model cannot say whether those Commands are alternatives.
- **us-00034-FR-5** (Ubiquitous) The system shall not evaluate the Policy's `condition`
  or choose between the Commands: `dispatch` records what the branch is, and nothing
  simulates it.

## Acceptance (GWT)

- **us-00034-AC-1.1** (us-00034-FR-1)
  Given a Policy that invokes two Commands
  When the Modeler sets its dispatch to `exclusive`
  Then the model stores `dispatch = exclusive`
  And the Policy shows that its Commands are alternatives
- **us-00034-AC-1.2** (us-00034-FR-1, us-00034-FR-2)
  Given a Policy whose dispatch is `exclusive`
  When the Modeler sets it back to `parallel`
  Then the Policy no longer shows the alternatives marker
- **us-00034-AC-2.1** (us-00034-FR-2)
  Given a Policy with no dispatch set
  When it is rendered and its slice is laid out
  Then it looks exactly as it did before this story
  And nothing on the board claims its Commands are alternatives
- **us-00034-AC-3.1** (us-00034-FR-3)
  Given a Policy whose dispatch is `exclusive`, with a condition and parameters
  When the Model is exported and imported again
  Then all of them survive unchanged
- **us-00034-AC-3.2** (us-00034-FR-3)
  Given a Model exported before this story, whose Policies have no dispatch
  When the Modeler imports it
  Then it loads without error
  And those Policies simply have no dispatch
- **us-00034-AC-4.1** (us-00034-FR-4)
  Given a Policy invoking two Commands with no dispatch set, and another invoking two
  with `dispatch = exclusive`
  When model health is analysed
  Then the one with no dispatch is reported
  And the one with `exclusive` is not
- **us-00034-AC-4.2** (us-00034-FR-4)
  Given a Policy invoking exactly one Command with no dispatch set
  When model health is analysed
  Then it is not reported, because one Command cannot be ambiguous

## Out of scope (recorded)

- `emits` and `produces` carry the same ambiguity — a success event vs a failure event
  are alternatives, and equal `order` on the timeline means "concurrent" for both cases.
  Extending `dispatch` to the Aggregate / External System / Command side is the natural
  follow-up and is not built here (decision-00012).
- CML's third operator, `inclusive` ("one or more, not necessarily all"), is left out of
  the enum until someone needs it.
- No guard text on edges, ever, per decision-00012.

## Links

- Spec: spec-00011-structured-rule-expression ·
  Decision: decision-00012-branching-as-policy-dispatch-not-edge-guards
