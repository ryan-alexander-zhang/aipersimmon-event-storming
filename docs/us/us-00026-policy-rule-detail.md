---
id: us-00026-policy-rule-detail
type: us
role: main
status: active
parent: spec-00011-structured-rule-expression
---

# User Story: policy rule detail

As a Modeler,
I want a Policy to carry a condition, an execution mode, and named parameters,
so that I can express a complex reaction rule concretely instead of cramming it
into one line of free text.

## Requirements (EARS)

- **us-00026-FR-1** (Event) When the Modeler sets a Policy's `condition` (guard
  text), the system shall store it and show it on the Policy.
- **us-00026-FR-2** (Event) When the Modeler sets a Policy's `execution` to
  `automatic` or `manual`, the system shall store it and show it.
- **us-00026-FR-3** (Event) When the Modeler adds, edits, or removes a named
  `parameter` (name + value) on a Policy, the system shall store the resulting
  parameter list.
- **us-00026-FR-4** (Ubiquitous) The `condition`, `execution`, and `parameters`
  attributes shall be optional; a Policy with none set shall behave and render as
  it does today.

## Acceptance (GWT)

- **us-00026-AC-1.1** (us-00026-FR-1)
  Given a Policy
  When the Modeler sets its condition to "retry count < 3"
  Then the model stores the condition
  And the Policy shows it
- **us-00026-AC-2.1** (us-00026-FR-2)
  Given a Policy with no execution set
  When the Modeler sets its execution to `manual`
  Then the model stores `execution = manual`
  And the Policy shows it
  And setting it to `automatic` replaces the stored value
- **us-00026-AC-3.1** (us-00026-FR-3)
  Given a Policy
  When the Modeler adds a parameter `retry = 3` and a parameter `radius = 2km`
  Then the model stores both in the parameter list
  And removing `retry` leaves only `radius`
- **us-00026-AC-4.1** (us-00026-FR-4)
  Given a Policy with no condition, execution, or parameters
  When the model is exported and re-imported
  Then the Policy loads without error
  And renders as before

## Links

- Spec: spec-00011-structured-rule-expression
